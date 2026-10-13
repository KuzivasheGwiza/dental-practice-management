using DentalPractice.API.Constants;
using DentalPractice.API.Data;
using DentalPractice.API.DTOs.Auth;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DentalPractice.API.Services;
using Microsoft.AspNetCore.RateLimiting;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public partial class AuthController(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext db,
    ITokenService tokenService,
    PortalEmailService emailService,
    IAuditService auditService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await userManager.FindByEmailAsync(email) is not null)
            return Conflict(new { message = "An account with this email address already exists." });

        var practice = await db.Practices.AsNoTracking().FirstAsync(x => x.IsActive, cancellationToken);
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            PhoneNumber = request.PhoneNumber.Trim(),
            IsActive = true,
            LockoutEnabled = true,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = "Registration failed.", errors = result.Errors.Select(x => x.Description) });

        await userManager.AddToRoleAsync(user, Roles.Patient);

        var existingPatient = await db.Patients.SingleOrDefaultAsync(
            x => x.PracticeId == practice.PracticeId && x.UserId == null && x.Email == email,
            cancellationToken);

        Patient patient;
        if (existingPatient is not null)
        {
            existingPatient.UserId = user.Id;
            existingPatient.FirstName = request.FirstName.Trim();
            existingPatient.LastName = request.LastName.Trim();
            existingPatient.PhoneNumber = request.PhoneNumber.Trim();
            existingPatient.DateOfBirth ??= request.DateOfBirth;
            existingPatient.UpdatedAtUtc = DateTime.UtcNow;
            patient = existingPatient;
        }
        else
        {
            patient = new Patient
            {
                PracticeId = practice.PracticeId,
                UserId = user.Id,
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                Email = email,
                PhoneNumber = request.PhoneNumber.Trim(),
                DateOfBirth = request.DateOfBirth,
                PreferredContactMethod = "Email"
            };
            db.Patients.Add(patient);
        }

        await db.SaveChangesAsync(cancellationToken);
        var roles = await userManager.GetRolesAsync(user);
        await auditService.LogAsync(user.Id, "REGISTER", "ApplicationUser", user.Id, cancellationToken: cancellationToken);
        return Ok(tokenService.CreateToken(user, roles.ToArray(), $"{patient.FirstName} {patient.LastName}"));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await userManager.FindByEmailAsync(email);
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "Invalid email or password." });

        if (await userManager.IsLockedOutAsync(user))
            return Unauthorized(new { message = "This account is temporarily locked after repeated failed sign-in attempts. Please try again later." });

        if (!await userManager.CheckPasswordAsync(user, request.Password))
        {
            await userManager.AccessFailedAsync(user);
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (await userManager.GetTwoFactorEnabledAsync(user))
        {
            var code = request.AuthenticatorCode?.Replace(" ", "").Replace("-", "");
            var validCode = !string.IsNullOrWhiteSpace(code) && await userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code);
            if (!validCode && !string.IsNullOrWhiteSpace(request.RecoveryCode))
                validCode = (await userManager.RedeemTwoFactorRecoveryCodeAsync(user, request.RecoveryCode.Trim())).Succeeded;
            if (!validCode)
            {
                await userManager.AccessFailedAsync(user);
                return Unauthorized(new { message = "Enter the current code from your authenticator app.", requiresTwoFactor = true });
            }
        }
        await userManager.ResetAccessFailedCountAsync(user);

        var patient = await db.Patients.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
        var staff = await db.Staff.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
        var displayName = patient is not null
            ? $"{patient.FirstName} {patient.LastName}"
            : staff is not null ? $"{staff.FirstName} {staff.LastName}" : user.Email ?? "User";

        user.LastLoginAtUtc = DateTime.UtcNow;
        user.UpdatedAtUtc = DateTime.UtcNow;
        await userManager.UpdateAsync(user);

        var roles = await userManager.GetRolesAsync(user);
        await auditService.LogAsync(user.Id, "LOGIN", "ApplicationUser", user.Id, cancellationToken: cancellationToken);
        return Ok(tokenService.CreateToken(user, roles.ToArray(), displayName));
    }
}
