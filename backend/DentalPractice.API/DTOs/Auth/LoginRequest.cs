using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Auth;

public class LoginRequest
{
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
    public string? AuthenticatorCode { get; set; }
    public string? RecoveryCode { get; set; }
}
