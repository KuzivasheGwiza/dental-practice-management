namespace DentalPractice.API.DTOs.Payments;

public record PaymentStatusDto(
    string BookingReference,
    string AppointmentStatus,
    string PaymentMethod,
    string PaymentStatus,
    decimal AmountDueAtBooking,
    decimal AmountPaid,
    DateTime? PaymentExpiresAtUtc,
    bool IsSecured,
    string? PayFastPaymentId);
