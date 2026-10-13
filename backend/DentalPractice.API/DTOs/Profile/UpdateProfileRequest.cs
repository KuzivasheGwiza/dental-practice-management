using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Profile;

public class UpdateProfileRequest
{
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string PhoneNumber { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? AlternativePhone { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(30)]
    public string? PreferredContactMethod { get; set; }

    [MaxLength(100)]
    public string? ProfessionalNumber { get; set; }

    [MaxLength(500)]
    public string? Qualifications { get; set; }

    [MaxLength(3000)]
    public string? Bio { get; set; }
}
