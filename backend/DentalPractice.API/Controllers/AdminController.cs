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
[Route("api/admin")]
[Authorize(Roles = Roles.Administrator)]
public class AdminController(ApplicationDbContext db, IAuditService auditService) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken cancellationToken)
    {
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);
        var weekEnd = today.AddDays(7);

        var result = new
        {
            TodaysAppointments = await db.Appointments.CountAsync(x => x.StartDateTime >= today && x.StartDateTime < tomorrow, cancellationToken),
            NextSevenDays = await db.Appointments.CountAsync(x => x.StartDateTime >= today && x.StartDateTime < weekEnd, cancellationToken),
            ActivePatients = await db.Patients.CountAsync(x => x.IsActive, cancellationToken),
            ActiveDentists = await db.Dentists.CountAsync(x => x.IsActive, cancellationToken),
            ActiveServices = await db.Services.CountAsync(x => x.IsActive, cancellationToken),
            PendingNotifications = await db.Notifications.CountAsync(x => x.Status == "Pending", cancellationToken)
        };
        return Ok(result);
    }

    [HttpGet("services")]
    public async Task<IActionResult> GetServices(CancellationToken cancellationToken)
        => Ok(await db.Services.AsNoTracking().OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken));

    [HttpPost("services")]
    public async Task<IActionResult> CreateService(ServiceUpsertRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var practiceId = await db.Practices.Where(x => x.IsActive).Select(x => x.PracticeId).FirstAsync(cancellationToken);
        var service = new Service
        {
            PracticeId = practiceId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            DefaultDurationMinutes = request.DefaultDurationMinutes,
            StartingPrice = request.StartingPrice,
            BookingPaymentAmount = request.BookingPaymentAmount,
            IsEmergencyService = request.IsEmergencyService,
            IsActive = request.IsActive,
            DisplayOrder = request.DisplayOrder
        };
        db.Services.Add(service);
        await db.SaveChangesAsync(cancellationToken);

        var dentistIds = await db.Dentists.Where(x => x.IsActive).Select(x => x.DentistId).ToListAsync(cancellationToken);
        db.DentistServices.AddRange(dentistIds.Select(dentistId => new DentistService
        {
            DentistId = dentistId,
            ServiceId = service.ServiceId,
            IsActive = true
        }));
        await db.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(userId, "CREATE", "Service", service.ServiceId.ToString(), null, request, cancellationToken);
        return Ok(service);
    }

    [HttpPut("services/{id:int}")]
    public async Task<IActionResult> UpdateService(int id, ServiceUpsertRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var service = await db.Services.SingleOrDefaultAsync(x => x.ServiceId == id, cancellationToken);
        if (service is null) return NotFound();
        var old = new { service.Name, service.DefaultDurationMinutes, service.StartingPrice, service.BookingPaymentAmount, service.IsEmergencyService, service.IsActive, service.DisplayOrder };

        service.Name = request.Name.Trim();
        service.Description = request.Description?.Trim();
        service.DefaultDurationMinutes = request.DefaultDurationMinutes;
        service.StartingPrice = request.StartingPrice;
        service.BookingPaymentAmount = request.BookingPaymentAmount;
        service.IsEmergencyService = request.IsEmergencyService;
        service.IsActive = request.IsActive;
        service.DisplayOrder = request.DisplayOrder;
        service.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(userId, "UPDATE", "Service", id.ToString(), old, request, cancellationToken);
        return NoContent();
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> AuditLogs([FromQuery] int take = 100, CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 500);
        var logs = await db.AuditLogs.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).Take(take).Select(x => new
        {
            x.AuditLogId,
            x.UserId,
            UserEmail = x.User != null ? x.User.Email : null,
            x.Action,
            x.EntityType,
            x.EntityId,
            x.OldValues,
            x.NewValues,
            x.IpAddress,
            x.CreatedAtUtc
        }).ToListAsync(cancellationToken);
        return Ok(logs);
    }
}
