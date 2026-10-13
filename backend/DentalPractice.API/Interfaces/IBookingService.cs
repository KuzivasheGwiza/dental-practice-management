using DentalPractice.API.DTOs.Appointments;
using DentalPractice.API.Models;

namespace DentalPractice.API.Interfaces;

public interface IBookingService
{
    Task<IReadOnlyCollection<AvailabilitySlotDto>> GetAvailableSlotsAsync(int dentistId, int serviceId, DateOnly date, CancellationToken cancellationToken = default);
    Task<Appointment> CreateAsync(int patientId, int dentistId, int serviceId, DateTime startDateTime, string bookingSource, string? patientNotes, string paymentMethod, string? createdByUserId, CancellationToken cancellationToken = default);
    Task<Appointment> RescheduleAsync(Appointment appointment, DateTime newStartDateTime, string? userId, CancellationToken cancellationToken = default);
    Task CancelAsync(Appointment appointment, string reason, string? userId, CancellationToken cancellationToken = default);
}
