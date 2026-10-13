using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Staff;

public class StaffCreateAppointmentRequest
{
    public int? PatientId { get; set; }
    [MaxLength(100)] public string? FirstName { get; set; }
    [MaxLength(100)] public string? LastName { get; set; }
    [EmailAddress] public string? Email { get; set; }
    [Phone] public string? PhoneNumber { get; set; }
    [Range(1, int.MaxValue)] public int DentistId { get; set; }
    [Range(1, int.MaxValue)] public int ServiceId { get; set; }
    public DateTime StartDateTime { get; set; }
    [MaxLength(1000)] public string? PatientNotes { get; set; }
    [MaxLength(50)] public string BookingSource { get; set; } = "Receptionist";
}
