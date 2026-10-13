namespace DentalPractice.API.Models;

public class Patient
{
    public int PatientId { get; set; }
    public int PracticeId { get; set; }
    public string? UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string? AlternativePhone { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PreferredContactMethod { get; set; } = "Email";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public Practice Practice { get; set; } = null!;
    public ApplicationUser? User { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
}
