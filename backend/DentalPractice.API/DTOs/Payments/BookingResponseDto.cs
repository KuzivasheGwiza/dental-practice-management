using DentalPractice.API.DTOs.Appointments;

namespace DentalPractice.API.DTOs.Payments;

public record BookingResponseDto(
    AppointmentDto Appointment,
    PayFastCheckoutDto? PayFast,
    string Message);
