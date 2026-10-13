using System.Security.Claims;
using DentalPractice.API.Constants;
using DentalPractice.API.Data;
using DentalPractice.API.DTOs.Admin;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/admin/staff")]
[Authorize(Roles = Roles.Administrator)]
public class AdminStaffController(
    ApplicationDbContext db,
    UserManager<ApplicationUser> userManager,
    IAuditService auditService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var staff = await db.Staff.AsNoTracking().OrderBy(x => x.FirstName).ThenBy(x => x.LastName).Select(x => new
        {
            x.StaffId,
            x.FirstName,
            x.LastName,
            x.JobTitle,
            x.StaffNumber,
            x.IsActive,
            x.UserId,
            Email = x.User.Email,
            PhoneNumber = x.User.PhoneNumber,
            DentistId = x.Dentist != null ? (int?)x.Dentist.DentistId : null,
            ProfessionalNumber = x.Dentist != null ? x.Dentist.ProfessionalNumber : null
        }).ToListAsync(cancellationToken);
        return Ok(staff);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateStaffRequest request, CancellationToken cancellationToken)
    {
        var allowedRoles = new[] { Roles.Receptionist, Roles.Dentist, Roles.Administrator };
        if (!allowedRoles.Contains(request.Role, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { message = "Role must be Receptionist, Dentist, or Administrator." });

        var role = allowedRoles.Single(x => x.Equals(request.Role, StringComparison.OrdinalIgnoreCase));
        var email = request.Email.Trim().ToLowerInvariant();
        if (await userManager.FindByEmailAsync(email) is not null)
            return Conflict(new { message = "A user with this email address already exists." });

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            PhoneNumber = request.PhoneNumber.Trim(),
            EmailConfirmed = true,
            IsActive = true,
            LockoutEnabled = true
        };
        var createResult = await userManager.CreateAsync(user, request.TemporaryPassword);
        if (!createResult.Succeeded)
            return BadRequest(new { message = "Could not create the staff account.", errors = createResult.Errors.Select(x => x.Description) });

        await userManager.AddToRoleAsync(user, role);
        var practiceId = await db.Practices.Where(x => x.IsActive).Select(x => x.PracticeId).FirstAsync(cancellationToken);
        var staff = new Staff
        {
            PracticeId = practiceId,
            UserId = user.Id,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            JobTitle = request.JobTitle.Trim(),
            StaffNumber = string.IsNullOrWhiteSpace(request.StaffNumber) ? null : request.StaffNumber.Trim(),
            IsActive = true
        };
        db.Staff.Add(staff);
        await db.SaveChangesAsync(cancellationToken);

        if (role == Roles.Dentist)
        {
            var dentist = new Dentist
            {
                StaffId = staff.StaffId,
                ProfessionalNumber = request.ProfessionalNumber?.Trim(),
                Qualifications = request.Qualifications?.Trim(),
                Bio = request.Bio?.Trim(),
                IsActive = true
            };
            db.Dentists.Add(dentist);
            await db.SaveChangesAsync(cancellationToken);

            var serviceIds = await db.Services.Where(x => x.PracticeId == practiceId && x.IsActive).Select(x => x.ServiceId).ToListAsync(cancellationToken);
            db.DentistServices.AddRange(serviceIds.Select(serviceId => new DentistService
            {
                DentistId = dentist.DentistId,
                ServiceId = serviceId,
                IsActive = true
            }));
            await db.SaveChangesAsync(cancellationToken);
        }

        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        await auditService.LogAsync(actorId, "CREATE", "Staff", staff.StaffId.ToString(), null,
            new { staff.FirstName, staff.LastName, staff.JobTitle, Role = role, Email = email }, cancellationToken);

        return Ok(new { staff.StaffId, user.Id, Email = email, Role = role });
    }

    [HttpPut("{staffId:int}/active")]
    public async Task<IActionResult> SetActive(int staffId, [FromBody] SetActiveRequest request, CancellationToken cancellationToken)
    {
        var staff = await db.Staff.Include(x => x.User).Include(x => x.Dentist).SingleOrDefaultAsync(x => x.StaffId == staffId, cancellationToken);
        if (staff is null) return NotFound();

        staff.IsActive = request.IsActive;
        staff.User.IsActive = request.IsActive;
        if (staff.Dentist is not null) staff.Dentist.IsActive = request.IsActive;
        staff.UpdatedAtUtc = DateTime.UtcNow;
        staff.User.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        await auditService.LogAsync(actorId, request.IsActive ? "ACTIVATE" : "DEACTIVATE", "Staff", staffId.ToString(), null,
            new { request.IsActive }, cancellationToken);
        return NoContent();
    }
}

public class SetActiveRequest
{
    public bool IsActive { get; set; }
}
