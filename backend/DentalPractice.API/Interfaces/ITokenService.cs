using DentalPractice.API.DTOs.Auth;
using DentalPractice.API.Models;

namespace DentalPractice.API.Interfaces;

public interface ITokenService
{
    AuthResponse CreateToken(ApplicationUser user, IReadOnlyCollection<string> roles, string displayName);
}
