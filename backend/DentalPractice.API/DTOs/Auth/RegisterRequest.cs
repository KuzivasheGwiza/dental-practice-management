using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Auth;

public class RegisterRequest
{
    [Required, MaxLength(100)] public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, Phone] public string PhoneNumber { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    [Required, MinLength(8)] public string Password { get; set; } = string.Empty;
}
