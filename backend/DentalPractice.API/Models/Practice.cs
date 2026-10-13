namespace DentalPractice.API.Models;

public class Practice
{
    public int PracticeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? TradingName { get; set; }
    public string? Phone { get; set; }
    public string? WhatsAppNumber { get; set; }
    public string? Email { get; set; }
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public string? LogoUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Patient> Patients { get; set; } = [];
    public ICollection<Staff> StaffMembers { get; set; } = [];
    public ICollection<Service> Services { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
    public ICollection<PracticeHours> PracticeHours { get; set; } = [];
}
