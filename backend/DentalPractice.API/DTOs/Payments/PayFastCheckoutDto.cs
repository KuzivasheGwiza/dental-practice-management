namespace DentalPractice.API.DTOs.Payments;

public record PayFastCheckoutDto(
    string PaymentUrl,
    IReadOnlyDictionary<string, string> Fields,
    DateTime ExpiresAtUtc);
