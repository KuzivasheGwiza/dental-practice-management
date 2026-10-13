using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Admin;

public class CreateStaffRequest
{
    [Required, MaxLength(100)] public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, Phone] public string PhoneNumber { get; set; } = string.Empty;
    [Required, MinLength(8)] public string TemporaryPassword { get; set; } = string.Empty;
    [Required] public string Role { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string JobTitle { get; set; } = string.Empty;
    public string? StaffNumber { get; set; }
    public string? ProfessionalNumber { get; set; }
    public string? Qualifications { get; set; }
    public string? Bio { get; set; }
}
