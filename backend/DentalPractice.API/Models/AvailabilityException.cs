namespace DentalPractice.API.Models;

public class AvailabilityException
{
    public int AvailabilityExceptionId { get; set; }
    public int DentistId { get; set; }
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string ExceptionType { get; set; } = "Blocked";
    public string? CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Dentist Dentist { get; set; } = null!;
}
