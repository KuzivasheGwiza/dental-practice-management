namespace DentalPractice.API.DTOs.Profile;

public class UserProfileDto
{
    public string UserId { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public IReadOnlyCollection<string> Roles { get; set; } = Array.Empty<string>();
    public bool HasProfileImage { get; set; }
    public DateTime? ProfileImageUpdatedAtUtc { get; set; }

    public int? PatientId { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? AlternativePhone { get; set; }
    public string? PreferredContactMethod { get; set; }

    public int? StaffId { get; set; }
    public string? StaffNumber { get; set; }
    public string? JobTitle { get; set; }

    public int? DentistId { get; set; }
    public string? ProfessionalNumber { get; set; }
    public string? Qualifications { get; set; }
    public string? Bio { get; set; }
}
