namespace DentalPractice.API.Models;

public class Staff
{
    public int StaffId { get; set; }
    public int PracticeId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? StaffNumber { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public Practice Practice { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
    public Dentist? Dentist { get; set; }
}
