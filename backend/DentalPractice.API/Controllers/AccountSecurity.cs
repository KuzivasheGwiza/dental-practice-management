using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using DentalPractice.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DentalPractice.API.Controllers;

public record EmailRequest([Required, EmailAddress] string Email);
public record TokenRequest([Required, EmailAddress] string Email, [Required] string Token);
public record ResetPasswordRequest([Required, EmailAddress] string Email, [Required] string Token, [Required, MinLength(8)] string Password);
public record CodeRequest([Required] string Code);

public partial class AuthController
{
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(EmailRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is { IsActive: true })
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            await emailService.SendAsync(user.Email!, "Reset your password", emailService.Link("account/reset", user.Email!, token), cancellationToken);
        }
        return Ok(new { message = "If an active account matches this email, a password-reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null || !user.IsActive) return BadRequest(new { message = "The reset link is invalid or expired." });
        var result = await userManager.ResetPasswordAsync(user, request.Token, request.Password);
        if (result.Succeeded) await auditService.LogAsync(user.Id, "PASSWORD_RESET", "ApplicationUser", user.Id);
        return result.Succeeded ? Ok(new { message = "Password changed. Sign in using your new password." }) : BadRequest(new { message = "Could not reset password.", errors = result.Errors.Select(x => x.Description) });
    }

    [Authorize]
    [HttpPost("send-verification")]
    public async Task<IActionResult> SendVerification(CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user is null) return Unauthorized();
        if (!user.EmailConfirmed)
        {
            var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
            await emailService.SendAsync(user.Email!, "Verify your email", emailService.Link("account/verify", user.Email!, token), cancellationToken);
        }
        return Ok(new { message = "A verification link has been sent if verification is needed." });
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(TokenRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null) return BadRequest(new { message = "The verification link is invalid." });
        var result = await userManager.ConfirmEmailAsync(user, request.Token);
        if (result.Succeeded) await auditService.LogAsync(user.Id, "VERIFY_EMAIL", "ApplicationUser", user.Id);
        return result.Succeeded ? Ok(new { message = "Email verified." }) : BadRequest(new { message = "The verification link is invalid or expired." });
    }

    [Authorize]
    [HttpGet("security")]
    public async Task<IActionResult> Security()
    {
        var user = await userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return user is null ? Unauthorized() : Ok(new { user.EmailConfirmed, user.TwoFactorEnabled });
    }

    [Authorize]
    [HttpPost("mfa/setup")]
    public async Task<IActionResult> SetupMfa()
    {
        var user = await userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user is null) return Unauthorized();
        if (user.TwoFactorEnabled) return BadRequest(new { message = "MFA is already enabled." });
        var key = await userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(key))
        {
            await userManager.ResetAuthenticatorKeyAsync(user);
            key = await userManager.GetAuthenticatorKeyAsync(user);
        }
        var roles = await userManager.GetRolesAsync(user);
        var session = tokenService.CreateToken(user, roles.ToArray(), User.FindFirstValue(ClaimTypes.Name) ?? user.Email!);
        return Ok(new { key, session, authenticatorUri = $"otpauth://totp/DentalPractice:{Uri.EscapeDataString(user.Email!)}?secret={key}&issuer=DentalPractice&digits=6" });
    }

    [Authorize]
    [HttpPost("mfa/enable")]
    public async Task<IActionResult> EnableMfa(CodeRequest request)
    {
        var user = await userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user is null) return Unauthorized();
        if (!await userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, request.Code.Replace(" ", "")))
            return BadRequest(new { message = "The authenticator code is invalid." });
        await userManager.SetTwoFactorEnabledAsync(user, true);
        await userManager.UpdateSecurityStampAsync(user);
        var recoveryCodes = await userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        await auditService.LogAsync(user.Id, "ENABLE_MFA", "ApplicationUser", user.Id);
        return Ok(new { message = "MFA enabled. Save your recovery codes, then sign in again.", recoveryCodes });
    }
}
