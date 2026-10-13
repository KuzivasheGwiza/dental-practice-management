using System.Security.Claims;
using DentalPractice.API.Constants;
using DentalPractice.API.Data;
using DentalPractice.API.DTOs.Admin;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/admin/dentists/{dentistId:int}")]
[Authorize(Roles = Roles.Administrator)]
public class AdminAvailabilityController(ApplicationDbContext db, IAuditService auditService) : ControllerBase
{
    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability(int dentistId, CancellationToken cancellationToken)
        => Ok(await db.DentistAvailabilities.AsNoTracking().Where(x => x.DentistId == dentistId)
            .OrderBy(x => x.DayOfWeek).ThenBy(x => x.StartTime).ToListAsync(cancellationToken));

    [HttpPost("availability")]
    public async Task<IActionResult> AddAvailability(int dentistId, AvailabilityRequest request, CancellationToken cancellationToken)
    {
        if (request.EndTime <= request.StartTime)
            return BadRequest(new { message = "End time must be later than start time." });
        if (!await db.Dentists.AnyAsync(x => x.DentistId == dentistId, cancellationToken)) return NotFound();

        var item = new DentistAvailability
        {
            DentistId = dentistId,
            DayOfWeek = request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveTo = request.EffectiveTo,
            IsActive = request.IsActive
        };
        db.DentistAvailabilities.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "CREATE", "DentistAvailability",
            item.DentistAvailabilityId.ToString(), null, request, cancellationToken);
        return Ok(item);
    }

    [HttpDelete("availability/{availabilityId:int}")]
    public async Task<IActionResult> DeleteAvailability(int dentistId, int availabilityId, CancellationToken cancellationToken)
    {
        var item = await db.DentistAvailabilities.SingleOrDefaultAsync(x => x.DentistAvailabilityId == availabilityId && x.DentistId == dentistId, cancellationToken);
        if (item is null) return NotFound();
        db.DentistAvailabilities.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "DELETE", "DentistAvailability", availabilityId.ToString(), null, null, cancellationToken);
        return NoContent();
    }

    [HttpGet("exceptions")]
    public async Task<IActionResult> GetExceptions(int dentistId, CancellationToken cancellationToken)
        => Ok(await db.AvailabilityExceptions.AsNoTracking().Where(x => x.DentistId == dentistId)
            .OrderByDescending(x => x.StartDateTime).Take(200).ToListAsync(cancellationToken));

    [HttpPost("exceptions")]
    public async Task<IActionResult> AddException(int dentistId, AvailabilityExceptionRequest request, CancellationToken cancellationToken)
    {
        if (request.EndDateTime <= request.StartDateTime)
            return BadRequest(new { message = "End date/time must be later than start date/time." });
        if (!await db.Dentists.AnyAsync(x => x.DentistId == dentistId, cancellationToken)) return NotFound();

        var item = new AvailabilityException
        {
            DentistId = dentistId,
            StartDateTime = request.StartDateTime,
            EndDateTime = request.EndDateTime,
            Reason = request.Reason.Trim(),
            ExceptionType = request.ExceptionType.Trim(),
            CreatedByUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)
        };
        db.AvailabilityExceptions.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "CREATE", "AvailabilityException",
            item.AvailabilityExceptionId.ToString(), null, request, cancellationToken);
        return Ok(item);
    }

    [HttpDelete("exceptions/{exceptionId:int}")]
    public async Task<IActionResult> DeleteException(int dentistId, int exceptionId, CancellationToken cancellationToken)
    {
        var item = await db.AvailabilityExceptions.SingleOrDefaultAsync(x => x.AvailabilityExceptionId == exceptionId && x.DentistId == dentistId, cancellationToken);
        if (item is null) return NotFound();
        db.AvailabilityExceptions.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "DELETE", "AvailabilityException", exceptionId.ToString(), null, null, cancellationToken);
        return NoContent();
    }
}
