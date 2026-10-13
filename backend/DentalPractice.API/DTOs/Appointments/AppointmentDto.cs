namespace DentalPractice.API.DTOs.Appointments;

public record AppointmentDto(
    int AppointmentId,
    string BookingReference,
    int PatientId,
    string PatientName,
    int DentistId,
    string DentistName,
    int ServiceId,
    string ServiceName,
    DateTime StartDateTime,
    DateTime EndDateTime,
    string Status,
    string BookingSource,
    string? PatientNotes,
    string? CancellationReason,
    string PaymentMethod,
    string PaymentStatus,
    decimal AmountDueAtBooking,
    decimal AmountPaid,
    bool IsSecured,
    DateTime? PaymentExpiresAtUtc);
