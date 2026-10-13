using System.Globalization;
using System.Net;
using System.Text;
using System.Security.Claims;
using DentalPractice.API.Constants;
using DentalPractice.API.Data;
using DentalPractice.API.DTOs.Payments;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using DentalPractice.API.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(
    ApplicationDbContext db,
    IPayFastService payFastService,
    IBookingService bookingService,
    IAuditService auditService,
    IOptions<PayFastOptions> payFastOptions) : ControllerBase
{
    private readonly PayFastOptions _payFastOptions = payFastOptions.Value;

    [HttpGet("config")]
    [Authorize(Roles = Roles.Patient)]
    public IActionResult Config()
    {
        var configured = payFastService.IsConfigured(out _);
        return Ok(new
        {
            payFastEnabled = configured,
            paymentWindowMinutes = Math.Clamp(_payFastOptions.PaymentWindowMinutes, 5, 60),
            minimumAmount = 5m,
            currency = "ZAR"
        });
    }

    [HttpGet("appointments/{bookingReference}")]
    [Authorize(Roles = Roles.Patient)]
    public async Task<ActionResult<PaymentStatusDto>> GetAppointmentPaymentStatus(string bookingReference, CancellationToken cancellationToken)
    {
        var patientId = await GetPatientIdAsync(cancellationToken);
        var item = await db.Appointments.AsNoTracking()
            .Where(x => x.PatientId == patientId && x.BookingReference == bookingReference)
            .Select(x => new PaymentStatusDto(
                x.BookingReference,
                x.AppointmentStatus.Name,
                x.PaymentMethod,
                x.PaymentStatus,
                x.AmountDueAtBooking,
                x.AmountPaid,
                x.PaymentExpiresAtUtc,
                x.IsSecured,
                x.Payments.OrderByDescending(p => p.CreatedAtUtc).Select(p => p.PayFastPaymentId).FirstOrDefault()))
            .SingleOrDefaultAsync(cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("appointments/{bookingReference}/payfast-checkout")]
    [Authorize(Roles = Roles.Patient)]
    public async Task<ActionResult<PayFastCheckoutDto>> RetryPayFast(string bookingReference, CancellationToken cancellationToken)
    {
        var patientId = await GetPatientIdAsync(cancellationToken);
        var appointment = await db.Appointments
            .Include(x => x.AppointmentStatus)
            .Include(x => x.Patient)
            .Include(x => x.Service)
            .SingleOrDefaultAsync(x => x.PatientId == patientId && x.BookingReference == bookingReference, cancellationToken);
        if (appointment is null) return NotFound();
        if (appointment.PaymentMethod != PaymentMethods.PayFast)
            return BadRequest(new { message = "This appointment was not created for PayFast payment." });
        if (appointment.IsSecured || appointment.PaymentStatus == PaymentStatuses.Paid)
            return BadRequest(new { message = "This appointment has already been paid and secured." });
        if (appointment.AppointmentStatus.Code != AppointmentStatusCodes.Pending)
            return BadRequest(new { message = "This appointment is no longer awaiting payment." });
        if (appointment.PaymentExpiresAtUtc is null || appointment.PaymentExpiresAtUtc <= DateTime.UtcNow)
            return BadRequest(new { message = "The payment window has expired. Please create a new appointment." });
        if (!payFastService.IsConfigured(out var reason))
            return BadRequest(new { message = reason });

        var payment = await db.AppointmentPayments
            .Where(x => x.AppointmentId == appointment.AppointmentId && x.Status == PaymentStatuses.Pending)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (payment is null)
        {
            payment = new AppointmentPayment
            {
                AppointmentId = appointment.AppointmentId,
                Provider = "PayFast",
                PaymentMethod = PaymentMethods.PayFast,
                Status = PaymentStatuses.Pending,
                Amount = appointment.AmountDueAtBooking,
                Currency = "ZAR",
                MerchantPaymentId = $"APT-{appointment.AppointmentId}-{Guid.NewGuid():N}",
                ExpiresAtUtc = appointment.PaymentExpiresAtUtc,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };
            db.AppointmentPayments.Add(payment);
            appointment.PaymentStatus = PaymentStatuses.Pending;
            appointment.UpdatedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }

        return Ok(payFastService.CreateCheckout(appointment, payment, appointment.Patient, appointment.Service));
    }

    [HttpPost("appointments/{bookingReference}/cancel-pending")]
    [Authorize(Roles = Roles.Patient)]
    public async Task<IActionResult> CancelPending(string bookingReference, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var patientId = await GetPatientIdAsync(cancellationToken);
        var appointment = await db.Appointments
            .Include(x => x.AppointmentStatus)
            .Include(x => x.Patient)
            .SingleOrDefaultAsync(x => x.PatientId == patientId && x.BookingReference == bookingReference, cancellationToken);
        if (appointment is null) return NotFound();
        if (appointment.AppointmentStatus.Code != AppointmentStatusCodes.Pending || appointment.AmountPaid > 0)
            return BadRequest(new { message = "Only an unpaid pending appointment can be released from the online checkout." });

        await bookingService.CancelAsync(appointment, "Patient cancelled PayFast checkout", userId, cancellationToken);
        return NoContent();
    }

    [HttpPost("payfast/itn")]
    [AllowAnonymous]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> PayFastItn(CancellationToken cancellationToken)
    {
        if (!Request.HasFormContentType)
            return BadRequest();

        // PayFast signs the fields in the order in which they are sent. Preserve the
        // raw form order before ASP.NET materialises the form collection.
        Request.EnableBuffering();
        string rawBody;
        using (var reader = new StreamReader(Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true))
            rawBody = await reader.ReadToEndAsync(cancellationToken);
        Request.Body.Position = 0;

        var form = await Request.ReadFormAsync(cancellationToken);
        var orderedValues = ParseOrderedFormBody(rawBody);
        var parameterString = payFastService.BuildParameterString(orderedValues, includePassphrase: false);
        if (!await payFastService.ValidateItnAsync(form, parameterString, HttpContext.Connection.RemoteIpAddress, cancellationToken))
            return BadRequest();

        var merchantPaymentId = form["m_payment_id"].ToString().Trim();
        var paymentStatus = form["payment_status"].ToString().Trim().ToUpperInvariant();
        var payFastPaymentId = form["pf_payment_id"].ToString().Trim();
        var customBookingReference = form["custom_str1"].ToString().Trim();

        if (string.IsNullOrWhiteSpace(merchantPaymentId))
            return BadRequest();

        if (!decimal.TryParse(form["amount_gross"].ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var amountGross))
            return BadRequest();

        decimal? amountFee = decimal.TryParse(form["amount_fee"].ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsedFee) ? parsedFee : null;
        decimal? amountNet = decimal.TryParse(form["amount_net"].ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsedNet) ? parsedNet : null;

        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        var payment = await db.AppointmentPayments
            .Include(x => x.Appointment)
                .ThenInclude(x => x.AppointmentStatus)
            .Include(x => x.Appointment)
                .ThenInclude(x => x.Patient)
            .SingleOrDefaultAsync(x => x.MerchantPaymentId == merchantPaymentId, cancellationToken);
        if (payment is null)
            return BadRequest();

        var appointment = payment.Appointment;
        if (!string.IsNullOrWhiteSpace(customBookingReference) && customBookingReference != appointment.BookingReference)
            return BadRequest();

        if (Math.Abs(payment.Amount - amountGross) > 0.01m)
            return BadRequest();

        if (!string.IsNullOrWhiteSpace(payFastPaymentId))
        {
            var duplicate = await db.AppointmentPayments.AnyAsync(x =>
                x.AppointmentPaymentId != payment.AppointmentPaymentId &&
                x.PayFastPaymentId == payFastPaymentId, cancellationToken);
            if (duplicate)
                return BadRequest();
        }

        // Never let a later FAILED/CANCELLED notification downgrade a payment that
        // has already been recorded as paid or paid-but-needing manual review.
        if (paymentStatus != "COMPLETE" &&
            payment.PaidAtUtc is not null &&
            payment.Status is PaymentStatuses.Paid or PaymentStatuses.PaidReviewRequired)
        {
            await transaction.CommitAsync(cancellationToken);
            return Ok();
        }

        payment.PayFastPaymentId = string.IsNullOrWhiteSpace(payFastPaymentId) ? payment.PayFastPaymentId : payFastPaymentId;
        payment.AmountGross = amountGross;
        payment.AmountFee = amountFee;
        payment.AmountNet = amountNet;
        payment.UpdatedAtUtc = DateTime.UtcNow;

        if (paymentStatus == "COMPLETE")
        {
            // Repeated ITNs for the same completed transaction are idempotent.
            if (payment.PaidAtUtc is not null &&
                payment.Status is PaymentStatuses.Paid or PaymentStatuses.PaidReviewRequired)
            {
                await transaction.CommitAsync(cancellationToken);
                return Ok();
            }

            var nowUtc = DateTime.UtcNow;
            payment.PaidAtUtc = nowUtc;
            appointment.AmountPaid += amountGross;

            // A second PayFast transaction can arrive after another attempt already
            // secured the appointment. Keep the booking secured but flag the extra
            // money for staff review/refund instead of silently unsecuring it.
            if (appointment.IsSecured)
            {
                payment.Status = PaymentStatuses.PaidReviewRequired;
                payment.FailureReason = "Additional PayFast payment received after this appointment had already been secured.";
                appointment.PaymentStatus = PaymentStatuses.PaidReviewRequired;
                appointment.UpdatedAtUtc = nowUtc;
                AddPaymentReviewNotification(appointment, "AdditionalPaymentReviewRequired");
            }
            else
            {
                var isActivePendingHold = appointment.AppointmentStatus.Code == AppointmentStatusCodes.Pending;
                var isExpiredSystemHold = appointment.AppointmentStatus.Code == AppointmentStatusCodes.Cancelled &&
                                          string.Equals(appointment.CancellationReason, "Online payment window expired", StringComparison.Ordinal);
                var canSecure = isActivePendingHold || isExpiredSystemHold;

                // If the reservation window already expired, only re-confirm a late
                // successful payment when the dentist's time has not been rebooked.
                if (canSecure && (isExpiredSystemHold || appointment.PaymentExpiresAtUtc is not null && appointment.PaymentExpiresAtUtc <= nowUtc))
                {
                    var overlapExists = await db.Appointments
                        .Include(x => x.AppointmentStatus)
                        .AnyAsync(x => x.AppointmentId != appointment.AppointmentId &&
                                       x.DentistId == appointment.DentistId &&
                                       AppointmentStatusCodes.ActiveBlocking.Contains(x.AppointmentStatus.Code) &&
                                       (x.AppointmentStatus.Code != AppointmentStatusCodes.Pending || x.PaymentExpiresAtUtc == null || x.PaymentExpiresAtUtc > nowUtc) &&
                                       appointment.StartDateTime < x.EndDateTime && appointment.EndDateTime > x.StartDateTime,
                            cancellationToken);
                    canSecure = !overlapExists;
                }

                if (canSecure)
                {
                    var confirmed = await db.AppointmentStatuses.SingleAsync(x => x.Code == AppointmentStatusCodes.Confirmed, cancellationToken);
                    payment.Status = PaymentStatuses.Paid;
                    payment.FailureReason = null;
                    appointment.AppointmentStatusId = confirmed.AppointmentStatusId;
                    appointment.AppointmentStatus = confirmed;
                    appointment.PaymentStatus = PaymentStatuses.Paid;
                    appointment.IsSecured = true;
                    appointment.PaymentExpiresAtUtc = null;
                    appointment.CancellationReason = null;
                    appointment.CancelledAtUtc = null;
                    appointment.UpdatedAtUtc = nowUtc;

                    db.Notifications.AddRange(
                        new Notification
                        {
                            PatientId = appointment.PatientId,
                            AppointmentId = appointment.AppointmentId,
                            NotificationType = "AppointmentConfirmation",
                            Channel = "Email",
                            Recipient = appointment.Patient.Email,
                            Status = "Pending",
                            CreatedAtUtc = nowUtc
                        },
                        new Notification
                        {
                            PatientId = appointment.PatientId,
                            AppointmentId = appointment.AppointmentId,
                            NotificationType = "PaymentReceipt",
                            Channel = "Email",
                            Recipient = appointment.Patient.Email,
                            Status = "Pending",
                            CreatedAtUtc = nowUtc
                        });
                }
                else
                {
                    payment.Status = PaymentStatuses.PaidReviewRequired;
                    payment.FailureReason = "Payment completed after the reservation expired, was cancelled, or the appointment time became unavailable.";
                    appointment.PaymentStatus = PaymentStatuses.PaidReviewRequired;
                    appointment.UpdatedAtUtc = nowUtc;
                    AddPaymentReviewNotification(appointment, "PaymentReviewRequired");
                }
            }
        }
        else if (paymentStatus == "FAILED")
        {
            payment.Status = PaymentStatuses.Failed;
            payment.FailureReason = "PayFast reported the payment as failed.";
            if (!appointment.IsSecured)
                appointment.PaymentStatus = PaymentStatuses.Failed;
        }
        else if (paymentStatus == "CANCELLED")
        {
            payment.Status = PaymentStatuses.Cancelled;
            payment.FailureReason = "PayFast reported the payment as cancelled.";
            if (!appointment.IsSecured)
                appointment.PaymentStatus = PaymentStatuses.Cancelled;
        }
        else
        {
            payment.Status = PaymentStatuses.Pending;
            if (!appointment.IsSecured)
                appointment.PaymentStatus = PaymentStatuses.Pending;
        }

        appointment.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(null, "PAYMENT_ITN", "AppointmentPayment", payment.AppointmentPaymentId.ToString(), null,
            new
            {
                payment.MerchantPaymentId,
                payment.PayFastPaymentId,
                PayFastStatus = paymentStatus,
                payment.Status,
                payment.AmountGross,
                Appointment = appointment.BookingReference,
                appointment.PaymentStatus,
                appointment.IsSecured
            }, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok();
    }

    private void AddPaymentReviewNotification(Appointment appointment, string notificationType)
    {
        db.Notifications.Add(new Notification
        {
            PatientId = appointment.PatientId,
            AppointmentId = appointment.AppointmentId,
            NotificationType = notificationType,
            Channel = "Email",
            Recipient = appointment.Patient.Email,
            Status = "Pending",
            CreatedAtUtc = DateTime.UtcNow
        });
    }

    private static IReadOnlyList<KeyValuePair<string, string>> ParseOrderedFormBody(string rawBody)
    {
        var result = new List<KeyValuePair<string, string>>();
        foreach (var pair in rawBody.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var separatorIndex = pair.IndexOf('=');
            var encodedKey = separatorIndex >= 0 ? pair[..separatorIndex] : pair;
            var encodedValue = separatorIndex >= 0 ? pair[(separatorIndex + 1)..] : string.Empty;
            var key = WebUtility.UrlDecode(encodedKey) ?? string.Empty;
            var value = WebUtility.UrlDecode(encodedValue) ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(key))
                result.Add(new KeyValuePair<string, string>(key, value));
        }
        return result;
    }

    private async Task<int> GetPatientIdAsync(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        return await db.Patients.Where(x => x.UserId == userId).Select(x => x.PatientId).SingleAsync(cancellationToken);
    }
}
