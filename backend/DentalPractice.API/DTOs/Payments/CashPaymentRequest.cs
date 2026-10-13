using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Payments;

public class CashPaymentRequest
{
    [Range(typeof(decimal), "0.01", "1000000", ParseLimitsInInvariantCulture = true)]
    public decimal Amount { get; set; }

    [MaxLength(300)]
    public string? Notes { get; set; }
}
