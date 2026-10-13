namespace DentalPractice.API.Models;

public class Service
{
    public int ServiceId { get; set; }
    public int PracticeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DefaultDurationMinutes { get; set; }
    public decimal? StartingPrice { get; set; }
    public decimal? BookingPaymentAmount { get; set; }
    public bool IsEmergencyService { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public Practice Practice { get; set; } = null!;
    public ICollection<DentistService> DentistServices { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}
