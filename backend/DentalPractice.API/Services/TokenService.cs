using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DentalPractice.API.DTOs.Auth;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using Microsoft.IdentityModel.Tokens;

namespace DentalPractice.API.Services;

public class TokenService(IConfiguration configuration, IHostEnvironment environment) : ITokenService
{
    public AuthResponse CreateToken(ApplicationUser user, IReadOnlyCollection<string> roles, string displayName)
    {
        var key = configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var issuer = configuration["Jwt:Issuer"] ?? "DentalPractice.API";
        var audience = configuration["Jwt:Audience"] ?? "DentalPractice.UI";
        var expiryMinutes = configuration.GetValue<int?>("Jwt:ExpiryMinutes") ?? 120;
        var expires = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, displayName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("security_stamp", user.SecurityStamp ?? "")
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expires,
            signingCredentials: credentials);

        return new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            expires,
            user.Id,
            user.Email ?? string.Empty,
            roles,
            displayName,
            !user.TwoFactorEnabled && (configuration.GetValue<bool?>("Security:RequireStaffMfa") ?? !environment.IsDevelopment()) &&
                roles.Any(role => role is "Administrator" or "Receptionist" or "Dentist"));
    }
}
