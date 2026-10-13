namespace DentalPractice.API.Options;

public class PayFastOptions
{
    public bool Enabled { get; set; }
    public bool Sandbox { get; set; } = true;
    public string MerchantId { get; set; } = string.Empty;
    public string MerchantKey { get; set; } = string.Empty;
    public string Passphrase { get; set; } = string.Empty;
    public string FrontendBaseUrl { get; set; } = "http://localhost:4200";
    public string PublicApiBaseUrl { get; set; } = string.Empty;
    public int PaymentWindowMinutes { get; set; } = 15;
    public bool RequireIpValidation { get; set; } = true;

    public string ProcessUrl => Sandbox
        ? "https://sandbox.payfast.co.za/eng/process"
        : "https://www.payfast.co.za/eng/process";

    public string ValidationUrl => Sandbox
        ? "https://sandbox.payfast.co.za/eng/query/validate"
        : "https://www.payfast.co.za/eng/query/validate";
}
