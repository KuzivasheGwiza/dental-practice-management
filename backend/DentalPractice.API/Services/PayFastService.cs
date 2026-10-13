using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using DentalPractice.API.DTOs.Payments;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using DentalPractice.API.Options;
using Microsoft.Extensions.Options;

namespace DentalPractice.API.Services;

public class PayFastService(
    HttpClient httpClient,
    IOptions<PayFastOptions> options,
    ILogger<PayFastService> logger) : IPayFastService
{
    private static readonly string[] ValidPayFastHosts =
    [
        "www.payfast.co.za",
        "w1w.payfast.co.za",
        "w2w.payfast.co.za",
        "sandbox.payfast.co.za"
    ];

    private readonly PayFastOptions _options = options.Value;

    public bool IsConfigured(out string reason)
    {
        if (!_options.Enabled)
        {
            reason = "PayFast payments are disabled.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(_options.MerchantId) || string.IsNullOrWhiteSpace(_options.MerchantKey))
        {
            reason = "PayFast merchant credentials have not been configured.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(_options.PublicApiBaseUrl))
        {
            reason = "The public API URL for the PayFast ITN callback has not been configured.";
            return false;
        }

        if (!Uri.TryCreate(_options.PublicApiBaseUrl, UriKind.Absolute, out var publicApiUri))
        {
            reason = "The PayFast public API URL is invalid.";
            return false;
        }

        if (!Uri.TryCreate(_options.FrontendBaseUrl, UriKind.Absolute, out var frontendUri))
        {
            reason = "The public frontend URL for PayFast return/cancel handling is invalid.";
            return false;
        }

        if (!_options.Sandbox && (publicApiUri.Scheme != Uri.UriSchemeHttps || frontendUri.Scheme != Uri.UriSchemeHttps))
        {
            reason = "Live PayFast return, cancel and ITN callback URLs must use HTTPS.";
            return false;
        }

        reason = string.Empty;
        return true;
    }

    public PayFastCheckoutDto CreateCheckout(Appointment appointment, AppointmentPayment payment, Patient patient, Service service)
    {
        if (!IsConfigured(out var reason))
            throw new InvalidOperationException(reason);

        var frontend = _options.FrontendBaseUrl.TrimEnd('/');
        var api = _options.PublicApiBaseUrl.TrimEnd('/');
        var bookingRef = Uri.EscapeDataString(appointment.BookingReference);

        var values = new List<KeyValuePair<string, string>>
        {
            new("merchant_id", _options.MerchantId.Trim()),
            new("merchant_key", _options.MerchantKey.Trim()),
            new("return_url", $"{frontend}/payment/payfast/return?bookingReference={bookingRef}"),
            new("cancel_url", $"{frontend}/payment/payfast/cancel?bookingReference={bookingRef}"),
            new("notify_url", $"{api}/api/payments/payfast/itn"),
            new("name_first", patient.FirstName),
            new("name_last", patient.LastName),
            new("email_address", patient.Email),
            new("cell_number", patient.PhoneNumber),
            new("m_payment_id", payment.MerchantPaymentId),
            new("amount", payment.Amount.ToString("0.00", CultureInfo.InvariantCulture)),
            new("item_name", Limit($"Dental appointment {appointment.BookingReference}", 100)),
            new("item_description", Limit(service.Name, 255)),
            new("custom_str1", appointment.BookingReference),
            new("custom_str2", appointment.AppointmentId.ToString(CultureInfo.InvariantCulture))
        };

        var signature = ComputeMd5(BuildParameterString(values, includePassphrase: true));
        var fields = values
            .Where(x => !string.IsNullOrWhiteSpace(x.Value))
            .ToDictionary(x => x.Key, x => x.Value.Trim());
        fields["signature"] = signature;

        return new PayFastCheckoutDto(
            _options.ProcessUrl,
            fields,
            payment.ExpiresAtUtc ?? DateTime.UtcNow.AddMinutes(Math.Max(5, _options.PaymentWindowMinutes)));
    }

    public async Task<bool> ValidateItnAsync(
        IFormCollection form,
        string rawParameterString,
        IPAddress? remoteIpAddress,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured(out var reason))
        {
            logger.LogWarning("Rejected PayFast ITN because the integration is not configured: {Reason}", reason);
            return false;
        }

        if (!form.TryGetValue("merchant_id", out var merchantId) ||
            !string.Equals(merchantId.ToString(), _options.MerchantId.Trim(), StringComparison.Ordinal))
        {
            logger.LogWarning("Rejected PayFast ITN because the merchant_id did not match the configured merchant.");
            return false;
        }

        if (!form.TryGetValue("signature", out var suppliedSignature))
        {
            logger.LogWarning("Rejected PayFast ITN because the signature was missing.");
            return false;
        }

        var signatureInput = rawParameterString;
        if (!string.IsNullOrWhiteSpace(_options.Passphrase))
            signatureInput += "&passphrase=" + UrlEncode(_options.Passphrase.Trim());

        var expectedSignature = ComputeMd5(signatureInput);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(expectedSignature),
                Encoding.ASCII.GetBytes(suppliedSignature.ToString().Trim().ToLowerInvariant())))
        {
            logger.LogWarning("Rejected PayFast ITN because the security signature was invalid.");
            return false;
        }

        if (_options.RequireIpValidation && !await IsPayFastIpAsync(remoteIpAddress))
        {
            logger.LogWarning("Rejected PayFast ITN because the source IP {RemoteIp} was not resolved from an approved PayFast host.", remoteIpAddress);
            return false;
        }

        try
        {
            using var content = new StringContent(rawParameterString, Encoding.UTF8, "application/x-www-form-urlencoded");
            using var response = await httpClient.PostAsync(_options.ValidationUrl, content, cancellationToken);
            var validationResponse = (await response.Content.ReadAsStringAsync(cancellationToken)).Trim();
            if (!response.IsSuccessStatusCode || !string.Equals(validationResponse, "VALID", StringComparison.Ordinal))
            {
                logger.LogWarning("Rejected PayFast ITN because server confirmation returned {StatusCode}/{Response}.",
                    (int)response.StatusCode, validationResponse);
                return false;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PayFast server confirmation failed.");
            return false;
        }

        return true;
    }

    public string BuildParameterString(IEnumerable<KeyValuePair<string, string>> values, bool includePassphrase)
    {
        var encoded = values
            .Where(x => !string.IsNullOrWhiteSpace(x.Value) && !string.Equals(x.Key, "signature", StringComparison.OrdinalIgnoreCase))
            .Select(x => $"{x.Key}={UrlEncode(x.Value.Trim())}")
            .ToList();

        if (includePassphrase && !string.IsNullOrWhiteSpace(_options.Passphrase))
            encoded.Add("passphrase=" + UrlEncode(_options.Passphrase.Trim()));

        return string.Join('&', encoded);
    }

    private static string UrlEncode(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var output = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes)
        {
            var c = (char)b;
            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c is '-' or '_' or '.')
                output.Append(c);
            else if (c == ' ')
                output.Append('+');
            else
                output.Append('%').Append(b.ToString("X2", CultureInfo.InvariantCulture));
        }
        return output.ToString();
    }

    private static string ComputeMd5(string value)
    {
        var hash = MD5.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string Limit(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];

    private static async Task<bool> IsPayFastIpAsync(IPAddress? remoteIpAddress)
    {
        if (remoteIpAddress is null)
            return false;

        var remote = remoteIpAddress.IsIPv4MappedToIPv6 ? remoteIpAddress.MapToIPv4() : remoteIpAddress;
        foreach (var host in ValidPayFastHosts)
        {
            try
            {
                var addresses = await Dns.GetHostAddressesAsync(host);
                if (addresses.Any(address =>
                    (address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address).Equals(remote)))
                    return true;
            }
            catch
            {
                // Try the remaining official PayFast hostnames. Final failure returns false.
            }
        }

        return false;
    }
}
