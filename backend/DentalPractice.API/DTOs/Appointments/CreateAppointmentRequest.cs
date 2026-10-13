using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Appointments;

public class CreateAppointmentRequest
{
    [Range(1, int.MaxValue)] public int DentistId { get; set; }
    [Range(1, int.MaxValue)] public int ServiceId { get; set; }
    public DateTime StartDateTime { get; set; }
    [MaxLength(1000)] public string? PatientNotes { get; set; }
    [Required, MaxLength(30)] public string PaymentMethod { get; set; } = "CASH_AT_PRACTICE";
}
