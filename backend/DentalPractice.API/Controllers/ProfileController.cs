using System.Security.Claims;
using DentalPractice.API.Data;
using DentalPractice.API.DTOs.Profile;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController(
    ApplicationDbContext db,
    UserManager<ApplicationUser> userManager,
    IAuditService auditService,
    IWebHostEnvironment environment) : ControllerBase
{
    private const long MaxProfileImageBytes = 5 * 1024 * 1024;
    private static readonly string[] AllowedContactMethods = ["Email", "SMS", "WhatsApp", "Phone"];

    [HttpGet]
    public async Task<ActionResult<UserProfileDto>> Get(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return Unauthorized();
        return Ok(await BuildProfileAsync(user, cancellationToken));
    }

    [HttpPut]
    public async Task<ActionResult<UserProfileDto>> Update(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return Unauthorized();

        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();
        var phoneNumber = request.PhoneNumber.Trim();

        if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName) || string.IsNullOrWhiteSpace(phoneNumber))
            return BadRequest(new { message = "First name, last name and phone number are required." });

        if (request.DateOfBirth is not null && request.DateOfBirth > DateOnly.FromDateTime(DateTime.UtcNow))
            return BadRequest(new { message = "Date of birth cannot be in the future." });

        var otherUser = await userManager.FindByEmailAsync(email);
        if (otherUser is not null && otherUser.Id != user.Id)
            return Conflict(new { message = "Another account already uses this email address." });

        var patient = await db.Patients.SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
        var staff = await db.Staff.Include(x => x.Dentist).SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);

        if (patient is not null && !string.IsNullOrWhiteSpace(request.PreferredContactMethod) &&
            !AllowedContactMethods.Contains(request.PreferredContactMethod.Trim(), StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = "Preferred contact method must be Email, SMS, WhatsApp or Phone." });

        var oldValues = new
        {
            patient?.FirstName,
            patient?.LastName,
            staffFirstName = staff?.FirstName,
            staffLastName = staff?.LastName,
            user.Email,
            user.PhoneNumber,
            patient?.AlternativePhone,
            patient?.DateOfBirth,
            patient?.PreferredContactMethod,
            professionalNumber = staff?.Dentist?.ProfessionalNumber,
            qualifications = staff?.Dentist?.Qualifications,
            bio = staff?.Dentist?.Bio
        };

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        if (!string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase)) user.EmailConfirmed = false;
        user.Email = email;
        user.UserName = email;
        user.NormalizedEmail = userManager.NormalizeEmail(email);
        user.NormalizedUserName = userManager.NormalizeName(email);
        user.PhoneNumber = phoneNumber;
        user.UpdatedAtUtc = DateTime.UtcNow;

        var userResult = await userManager.UpdateAsync(user);
        if (!userResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);
            return BadRequest(new { message = "Could not update the account details.", errors = userResult.Errors.Select(x => x.Description) });
        }

        if (patient is not null)
        {
            patient.FirstName = firstName;
            patient.LastName = lastName;
            patient.Email = email;
            patient.PhoneNumber = phoneNumber;
            patient.AlternativePhone = Clean(request.AlternativePhone);
            patient.DateOfBirth = request.DateOfBirth;
            patient.PreferredContactMethod = string.IsNullOrWhiteSpace(request.PreferredContactMethod)
                ? patient.PreferredContactMethod
                : NormalizeContactMethod(request.PreferredContactMethod);
            patient.UpdatedAtUtc = DateTime.UtcNow;
        }

        if (staff is not null)
        {
            staff.FirstName = firstName;
            staff.LastName = lastName;
            staff.UpdatedAtUtc = DateTime.UtcNow;

            if (staff.Dentist is not null)
            {
                staff.Dentist.ProfessionalNumber = Clean(request.ProfessionalNumber);
                staff.Dentist.Qualifications = Clean(request.Qualifications);
                staff.Dentist.Bio = Clean(request.Bio);
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(user.Id, "UPDATE", "UserProfile", user.Id, oldValues, new
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            PhoneNumber = phoneNumber,
            AlternativePhone = patient?.AlternativePhone,
            DateOfBirth = patient?.DateOfBirth,
            PreferredContactMethod = patient?.PreferredContactMethod,
            ProfessionalNumber = staff?.Dentist?.ProfessionalNumber,
            Qualifications = staff?.Dentist?.Qualifications,
            Bio = staff?.Dentist?.Bio
        }, cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return Ok(await BuildProfileAsync(user, cancellationToken));
    }

    [HttpGet("photo")]
    public async Task<IActionResult> GetPhoto(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(user.ProfileImageFileName)) return NotFound();

        var path = GetProfileImagePath(user.ProfileImageFileName);
        if (!System.IO.File.Exists(path)) return NotFound();

        Response.Headers.CacheControl = "private, max-age=300";
        return PhysicalFile(path, user.ProfileImageContentType ?? "application/octet-stream", enableRangeProcessing: false);
    }

    [HttpPost("photo")]
    [RequestSizeLimit(MaxProfileImageBytes + 1024 * 128)]
    public async Task<ActionResult<UserProfileDto>> UploadPhoto(IFormFile file, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return Unauthorized();
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Choose a profile picture to upload." });
        if (file.Length > MaxProfileImageBytes)
            return BadRequest(new { message = "Profile pictures must be 5 MB or smaller." });

        var extension = GetSafeImageExtension(file.ContentType);
        if (extension is null || !await HasValidImageSignatureAsync(file, file.ContentType, cancellationToken))
            return BadRequest(new { message = "Only valid JPG, PNG or WebP images are allowed." });

        var directory = GetProfileImageDirectory();
        Directory.CreateDirectory(directory);

        var newFileName = $"{user.Id}_{Guid.NewGuid():N}{extension}";
        var newPath = Path.Combine(directory, newFileName);
        await using (var output = new FileStream(newPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
            await file.CopyToAsync(output, cancellationToken);

        var oldFileName = user.ProfileImageFileName;
        try
        {
            user.ProfileImageFileName = newFileName;
            user.ProfileImageContentType = file.ContentType;
            user.ProfileImageUpdatedAtUtc = DateTime.UtcNow;
            user.UpdatedAtUtc = DateTime.UtcNow;

            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded)
                throw new InvalidOperationException("Could not save the profile picture metadata.");

            await auditService.LogAsync(user.Id, "UPLOAD", "ProfileImage", user.Id, null,
                new { FileType = file.ContentType, file.Length }, cancellationToken);
        }
        catch
        {
            TryDeleteFile(newPath);
            throw;
        }

        if (!string.IsNullOrWhiteSpace(oldFileName) && !string.Equals(oldFileName, newFileName, StringComparison.OrdinalIgnoreCase))
            TryDeleteFile(GetProfileImagePath(oldFileName));

        return Ok(await BuildProfileAsync(user, cancellationToken));
    }

    [HttpDelete("photo")]
    public async Task<ActionResult<UserProfileDto>> DeletePhoto(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();
        if (user is null) return Unauthorized();

        var oldFileName = user.ProfileImageFileName;
        if (string.IsNullOrWhiteSpace(oldFileName))
            return Ok(await BuildProfileAsync(user, cancellationToken));

        user.ProfileImageFileName = null;
        user.ProfileImageContentType = null;
        user.ProfileImageUpdatedAtUtc = null;
        user.UpdatedAtUtc = DateTime.UtcNow;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { message = "Could not remove the profile picture.", errors = result.Errors.Select(x => x.Description) });

        await auditService.LogAsync(user.Id, "DELETE", "ProfileImage", user.Id, null, null, cancellationToken);
        TryDeleteFile(GetProfileImagePath(oldFileName));
        return Ok(await BuildProfileAsync(user, cancellationToken));
    }

    private async Task<ApplicationUser?> GetCurrentUserAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(userId) ? null : await userManager.FindByIdAsync(userId);
    }

    private async Task<UserProfileDto> BuildProfileAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var patient = await db.Patients.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
        var staff = await db.Staff.AsNoTracking().Include(x => x.Dentist).SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
        var roles = await userManager.GetRolesAsync(user);

        return new UserProfileDto
        {
            UserId = user.Id,
            FirstName = patient?.FirstName ?? staff?.FirstName ?? string.Empty,
            LastName = patient?.LastName ?? staff?.LastName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            Roles = roles.ToArray(),
            HasProfileImage = !string.IsNullOrWhiteSpace(user.ProfileImageFileName),
            ProfileImageUpdatedAtUtc = user.ProfileImageUpdatedAtUtc,
            PatientId = patient?.PatientId,
            DateOfBirth = patient?.DateOfBirth,
            AlternativePhone = patient?.AlternativePhone,
            PreferredContactMethod = patient?.PreferredContactMethod,
            StaffId = staff?.StaffId,
            StaffNumber = staff?.StaffNumber,
            JobTitle = staff?.JobTitle,
            DentistId = staff?.Dentist?.DentistId,
            ProfessionalNumber = staff?.Dentist?.ProfessionalNumber,
            Qualifications = staff?.Dentist?.Qualifications,
            Bio = staff?.Dentist?.Bio
        };
    }

    private string GetProfileImageDirectory() => Path.Combine(environment.ContentRootPath, "App_Data", "ProfilePictures");

    private string GetProfileImagePath(string fileName) => Path.Combine(GetProfileImageDirectory(), Path.GetFileName(fileName));

    private static string? GetSafeImageExtension(string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => null
    };

    private static async Task<bool> HasValidImageSignatureAsync(IFormFile file, string contentType, CancellationToken cancellationToken)
    {
        var header = new byte[12];
        await using var input = file.OpenReadStream();
        var read = await input.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);

        if (contentType.Equals("image/jpeg", StringComparison.OrdinalIgnoreCase))
            return read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;

        if (contentType.Equals("image/png", StringComparison.OrdinalIgnoreCase))
            return read >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                   header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A;

        if (contentType.Equals("image/webp", StringComparison.OrdinalIgnoreCase))
            return read >= 12 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                   header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50;

        return false;
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string NormalizeContactMethod(string value)
    {
        var trimmed = value.Trim();
        return AllowedContactMethods.Single(x => x.Equals(trimmed, StringComparison.OrdinalIgnoreCase));
    }

    private static void TryDeleteFile(string path)
    {
        try
        {
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
        }
        catch
        {
            // File cleanup failure should not roll back a successful profile update.
        }
    }
}
