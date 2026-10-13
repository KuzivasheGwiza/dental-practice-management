namespace DentalPractice.API.DTOs.Auth;

public record AuthResponse(
    string Token,
    DateTime ExpiresAtUtc,
    string UserId,
    string Email,
    IReadOnlyCollection<string> Roles,
    string DisplayName,
    bool MfaEnrollmentRequired = false);
