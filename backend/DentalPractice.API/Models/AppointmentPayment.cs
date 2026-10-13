namespace DentalPractice.API.Models;

public class AppointmentPayment
{
    public int AppointmentPaymentId { get; set; }
    public int AppointmentId { get; set; }
    public string Provider { get; set; } = "PayFast";
    public string PaymentMethod { get; set; } = "PAYFAST";
    public string Status { get; set; } = "PENDING";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "ZAR";
    public string MerchantPaymentId { get; set; } = string.Empty;
    public string? PayFastPaymentId { get; set; }
    public decimal? AmountGross { get; set; }
    public decimal? AmountFee { get; set; }
    public decimal? AmountNet { get; set; }
    public string? FailureReason { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime? PaidAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public Appointment Appointment { get; set; } = null!;
}
