namespace DentalPractice.API.Models;

public class PracticeHours
{
    public int PracticeHoursId { get; set; }
    public int PracticeId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly? OpeningTime { get; set; }
    public TimeOnly? ClosingTime { get; set; }
    public bool IsClosed { get; set; }

    public Practice Practice { get; set; } = null!;
}
