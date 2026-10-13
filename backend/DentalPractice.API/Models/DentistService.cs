namespace DentalPractice.API.Models;

public class DentistService
{
    public int DentistId { get; set; }
    public int ServiceId { get; set; }
    public int? CustomDurationMinutes { get; set; }
    public bool IsActive { get; set; } = true;

    public Dentist Dentist { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
