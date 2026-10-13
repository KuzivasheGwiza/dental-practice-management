using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Admin;

public class AvailabilityExceptionRequest
{
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    [Required, MaxLength(500)] public string Reason { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string ExceptionType { get; set; } = "Blocked";
}
