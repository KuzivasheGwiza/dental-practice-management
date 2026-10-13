namespace DentalPractice.API.Models;

public class DentistAvailability
{
    public int DentistAvailabilityId { get; set; }
    public int DentistId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;

    public Dentist Dentist { get; set; } = null!;
}
