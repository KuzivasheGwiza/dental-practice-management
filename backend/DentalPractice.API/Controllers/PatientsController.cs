using System.Security.Claims;
using DentalPractice.API.Constants;
using DentalPractice.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/patients")]
[Authorize(Roles = Roles.Patient)]
public class PatientsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var patient = await db.Patients.AsNoTracking().Where(x => x.UserId == userId).Select(x => new
        {
            x.PatientId,
            x.FirstName,
            x.LastName,
            x.DateOfBirth,
            x.Email,
            x.PhoneNumber,
            x.AlternativePhone,
            x.PreferredContactMethod
        }).SingleAsync(cancellationToken);
        return Ok(patient);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe(PatientProfileUpdateRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var patient = await db.Patients.SingleAsync(x => x.UserId == userId, cancellationToken);
        patient.FirstName = request.FirstName.Trim();
        patient.LastName = request.LastName.Trim();
        patient.PhoneNumber = request.PhoneNumber.Trim();
        patient.AlternativePhone = string.IsNullOrWhiteSpace(request.AlternativePhone) ? null : request.AlternativePhone.Trim();
        patient.DateOfBirth = request.DateOfBirth;
        patient.PreferredContactMethod = request.PreferredContactMethod.Trim();
        patient.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

public class PatientProfileUpdateRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? AlternativePhone { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string PreferredContactMethod { get; set; } = "Email";
}
