using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Staff;

public class UpdateAppointmentStatusRequest
{
    [Required] public string StatusCode { get; set; } = string.Empty;
    [MaxLength(1000)] public string? InternalNotes { get; set; }
}
