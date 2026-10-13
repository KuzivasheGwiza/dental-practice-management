using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Data;
using DentalPractice.API.Data;
using DentalPractice.API.Models;
using DentalPractice.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/portal")]
public class PortalController(ApplicationDbContext db, IAuditService audit) : ControllerBase
{
    [HttpGet("content")]
    public async Task<IActionResult> Content(CancellationToken ct) => Ok(await db.PortalContents.AsNoTracking().OrderBy(x => x.PortalContentId).FirstOrDefaultAsync(ct) ?? new PortalContent());

    [Authorize(Roles = "Administrator")]
    [HttpPut("content")]
    public async Task<IActionResult> SaveContent(ContentRequest request, CancellationToken ct)
    {
        var content = await db.PortalContents.OrderBy(x => x.PortalContentId).FirstOrDefaultAsync(ct);
        if (content is null) { content = new PortalContent(); db.PortalContents.Add(content); }
        content.ConsultationInformation = request.ConsultationInformation.Trim();
        content.PreparationInstructions = request.PreparationInstructions.Trim();
        content.CancellationPolicy = request.CancellationPolicy.Trim();
        content.PrivacyNotice = request.PrivacyNotice.Trim();
        content.Faqs = request.Faqs.Trim();
        content.ChangeDeadlineHours = request.ChangeDeadlineHours;
        content.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "UPDATE_CONTENT", "PortalContent", content.PortalContentId.ToString(), cancellationToken: ct);
        return Ok(content);
    }

    [Authorize(Roles = "Administrator")]
    [HttpPut("contact")]
    public async Task<IActionResult> SaveContact(ContactRequest request, CancellationToken ct)
    {
        var practice = await db.Practices.FirstAsync(x => x.IsActive, ct);
        practice.Name = request.Name.Trim(); practice.Email = request.Email.Trim(); practice.Phone = request.Phone.Trim();
        practice.AddressLine1 = request.AddressLine1.Trim(); practice.City = request.City.Trim(); practice.Province = request.Province.Trim();
        practice.PostalCode = request.PostalCode.Trim(); practice.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "UPDATE_CONTACT", "Practice", practice.PracticeId.ToString(), cancellationToken: ct);
        return NoContent();
    }

    [Authorize(Roles = "Administrator,Receptionist,Dentist")]
    [HttpGet("patients")]
    public async Task<IActionResult> Patients([FromQuery] string q, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2) return BadRequest(new { message = "Enter at least two characters." });
        q = q.Trim();
        var patients = await db.Patients.AsNoTracking().Where(x => x.IsActive && (x.FirstName.Contains(q) || x.LastName.Contains(q) || x.Email.Contains(q) || x.PhoneNumber.Contains(q)))
            .OrderBy(x => x.LastName).ThenBy(x => x.FirstName).Take(50)
            .Select(x => new { x.PatientId, x.FirstName, x.LastName, x.Email, x.PhoneNumber }).ToListAsync(ct);
        await audit.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "PATIENT_LOOKUP", "Patient", null, cancellationToken: ct);
        return Ok(patients);
    }

    [Authorize(Roles = "Administrator")]
    [HttpPut("hours")]
    public async Task<IActionResult> SaveHours(HourRequest[] request, CancellationToken ct)
    {
        if (request.Length != 7 || request.Select(x => x.DayOfWeek).Distinct().Count() != 7 ||
            request.Any(x => x.DayOfWeek < 0 || x.DayOfWeek > 6 || (!x.IsClosed && (x.OpeningTime is null || x.ClosingTime is null || x.ClosingTime <= x.OpeningTime))))
            return BadRequest(new { message = "Provide all seven days with valid opening and closing times." });
        var practice = await db.Practices.FirstAsync(x => x.IsActive, ct);
        var hours = await db.PracticeHours.Where(x => x.PracticeId == practice.PracticeId).ToListAsync(ct);
        foreach (var day in request)
        {
            var item = hours.SingleOrDefault(x => (int)x.DayOfWeek == day.DayOfWeek);
            if (item is null) { item = new PracticeHours { PracticeId = practice.PracticeId, DayOfWeek = (DayOfWeek)day.DayOfWeek }; db.PracticeHours.Add(item); }
            item.IsClosed = day.IsClosed; item.OpeningTime = day.IsClosed ? null : day.OpeningTime; item.ClosingTime = day.IsClosed ? null : day.ClosingTime;
        }
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "UPDATE_HOURS", "Practice", practice.PracticeId.ToString(), cancellationToken: ct);
        return NoContent();
    }

    [Authorize(Roles = "Administrator,Receptionist")]
    [HttpGet("reports")]
    public async Task<IActionResult> Reports([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct)
    {
        if (to < from || to.DayNumber - from.DayNumber > 366) return BadRequest(new { message = "Select a date range of at most one year." });
        var start = from.ToDateTime(TimeOnly.MinValue); var end = to.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var appointments = db.Appointments.Where(x => x.StartDateTime >= start && x.StartDateTime < end);
        var payments = db.AppointmentPayments.Where(x => x.Status == "PAID" && x.PaidAtUtc >= start.AddHours(-2) && x.PaidAtUtc < end.AddHours(-2));
        var refunds = db.PaymentRefunds.Where(x => x.CreatedAtUtc >= start.AddHours(-2) && x.CreatedAtUtc < end.AddHours(-2));
        return Ok(new { bookings = await appointments.CountAsync(ct), cancellations = await appointments.CountAsync(x => x.AppointmentStatus.Code == "CANCELLED", ct),
            noShows = await appointments.CountAsync(x => x.AppointmentStatus.Code == "NO_SHOW", ct), collected = await payments.SumAsync(x => (decimal?)x.Amount, ct) ?? 0,
            refunded = await refunds.SumAsync(x => (decimal?)x.Amount, ct) ?? 0,
            outstandingBookingPayments = await appointments.Where(x => x.AppointmentStatus.Code != "CANCELLED").SumAsync(x => x.AmountDueAtBooking > x.AmountPaid ? (decimal?)(x.AmountDueAtBooking - x.AmountPaid) : 0, ct) ?? 0 });
    }

    [Authorize]
    [HttpGet("receipts/{id:int}")]
    public async Task<IActionResult> Receipt(int id, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var staffAccess = User.IsInRole("Administrator") || User.IsInRole("Receptionist");
        var appointment = await db.Appointments.AsNoTracking().Include(x => x.Patient).Include(x => x.Service)
            .SingleOrDefaultAsync(x => x.AppointmentId == id && (staffAccess || x.Patient.UserId == userId), ct);
        if (appointment is null) return NotFound();
        var payments = await db.AppointmentPayments.AsNoTracking().Where(x => x.AppointmentId == id && x.Status == "PAID")
            .OrderBy(x => x.PaidAtUtc).Select(x => new { receiptNumber = x.MerchantPaymentId, x.Amount, x.Currency, x.PaymentMethod, x.PaidAtUtc }).ToListAsync(ct);
        var refunds = await db.PaymentRefunds.AsNoTracking().Where(x => x.AppointmentId == id)
            .Select(x => new { x.Amount, x.Reason, x.ExternalReference, x.CreatedAtUtc }).ToListAsync(ct);
        await audit.LogAsync(userId, "VIEW_RECEIPT", "Appointment", id.ToString(), cancellationToken: ct);
        return Ok(new { appointment.BookingReference, patientName = appointment.Patient.FirstName + " " + appointment.Patient.LastName,
            serviceName = appointment.Service.Name, appointment.StartDateTime, appointment.AmountDueAtBooking, appointment.AmountPaid, payments, refunds });
    }

    [Authorize(Roles = "Administrator,Receptionist")]
    [HttpPost("refunds/{id:int}")]
    public async Task<IActionResult> RecordRefund(int id, RefundRequest request, CancellationToken ct)
    {
        if (decimal.Round(request.Amount, 2) != request.Amount) return BadRequest(new { message = "Use at most two decimal places for a refund amount." });
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var appointment = await db.Appointments.Include(x => x.Patient).SingleOrDefaultAsync(x => x.AppointmentId == id, ct);
        if (appointment is null) return NotFound();
        var paid = await db.AppointmentPayments.Where(x => x.AppointmentId == id && x.Status == "PAID").SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        var refunded = await db.PaymentRefunds.Where(x => x.AppointmentId == id).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        if (request.Amount > paid - refunded) return BadRequest(new { message = "The refund exceeds the unrefunded amount received." });
        if (await db.PaymentRefunds.AnyAsync(x => x.ExternalReference == request.ExternalReference.Trim(), ct))
            return Conflict(new { message = "This refund reference has already been recorded." });
        db.PaymentRefunds.Add(new PaymentRefund { AppointmentId = id, Amount = request.Amount, Reason = request.Reason.Trim(),
            ExternalReference = request.ExternalReference.Trim(), RecordedByUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)! });
        // Preserve gross amount received. Refund records form a separate ledger.
        appointment.PaymentStatus = request.Amount + refunded == paid ? "REFUNDED" : "PARTIALLY_REFUNDED";
        appointment.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(User.FindFirstValue(ClaimTypes.NameIdentifier), "RECORD_REFUND", "Appointment", id.ToString(), null, new { request.Amount, request.ExternalReference }, ct);
        await transaction.CommitAsync(ct);
        return Ok(new { message = "Completed refund recorded. This records a refund already made through PayFast or at reception." });
    }

    [Authorize(Roles = "Administrator")]
    [HttpGet("notifications")]
    public async Task<IActionResult> Notifications(CancellationToken ct) => Ok(await db.Notifications.AsNoTracking().OrderByDescending(x => x.NotificationId).Take(100)
        .Select(x => new { x.NotificationId, x.NotificationType, x.Status, x.CreatedAtUtc, x.SentAtUtc }).ToListAsync(ct));
}

public record ContentRequest([Required, MaxLength(10000)] string ConsultationInformation, [Required, MaxLength(10000)] string PreparationInstructions,
    [Required, MaxLength(10000)] string CancellationPolicy, [Required, MaxLength(20000)] string PrivacyNotice, [Required, MaxLength(20000)] string Faqs,
    [Range(0, 168)] int ChangeDeadlineHours);
public record ContactRequest([Required, MaxLength(200)] string Name, [Required, EmailAddress] string Email, [Required, MaxLength(30)] string Phone,
    [Required, MaxLength(300)] string AddressLine1, [Required, MaxLength(100)] string City, [Required, MaxLength(100)] string Province, [MaxLength(20)] string PostalCode);
public record RefundRequest([Range(typeof(decimal), "0.01", "1000000", ParseLimitsInInvariantCulture = true)] decimal Amount, [Required, MaxLength(1000)] string Reason, [Required, MaxLength(200)] string ExternalReference);
public record HourRequest(int DayOfWeek, TimeOnly? OpeningTime, TimeOnly? ClosingTime, bool IsClosed);
