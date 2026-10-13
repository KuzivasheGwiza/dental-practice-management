using System.Security.Claims;
using DentalPractice.API.Constants;
using DentalPractice.API.Data;
using DentalPractice.API.DTOs.Appointments;
using DentalPractice.API.DTOs.Payments;
using DentalPractice.API.DTOs.Staff;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/staff/appointments")]
[Authorize(Roles = Roles.Receptionist + "," + Roles.Dentist + "," + Roles.Administrator)]
public class StaffAppointmentsController(ApplicationDbContext db, IBookingService bookingService, IAuditService auditService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<AppointmentDto>>> Get([FromQuery] DateOnly? date, [FromQuery] string view = "day", CancellationToken cancellationToken = default)
    {
        var selectedDate = date ?? DateOnly.FromDateTime(DateTime.Today);
        var start = selectedDate.ToDateTime(TimeOnly.MinValue);
        if (view == "week") start = start.AddDays(-(((int)start.DayOfWeek + 6) % 7));
        if (view == "month") start = new DateTime(start.Year, start.Month, 1);
        if (view is not ("day" or "week" or "month")) return BadRequest(new { message = "Choose day, week or month." });
        var end = view == "month" ? start.AddMonths(1) : start.AddDays(view == "week" ? 7 : 1);

        var items = await db.Appointments.AsNoTracking()
            .Where(x => x.StartDateTime >= start && x.StartDateTime < end)
            .OrderBy(x => x.StartDateTime)
            .Select(x => new AppointmentDto(
                x.AppointmentId,
                x.BookingReference,
                x.PatientId,
                x.Patient.FirstName + " " + x.Patient.LastName,
                x.DentistId,
                x.Dentist.Staff.FirstName + " " + x.Dentist.Staff.LastName,
                x.ServiceId,
                x.Service.Name,
                x.StartDateTime,
                x.EndDateTime,
                x.AppointmentStatus.Name,
                x.BookingSource,
                x.PatientNotes,
                x.CancellationReason,
                x.PaymentMethod,
                x.PaymentStatus,
                x.AmountDueAtBooking,
                x.AmountPaid,
                x.IsSecured,
                x.PaymentExpiresAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<AppointmentDto>> Create(StaffCreateAppointmentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var practiceId = await db.Practices.Where(x => x.IsActive).Select(x => x.PracticeId).FirstAsync(cancellationToken);
        Patient patient;

        if (request.PatientId.HasValue)
        {
            patient = await db.Patients.SingleOrDefaultAsync(x => x.PatientId == request.PatientId && x.IsActive, cancellationToken)
                ?? throw new InvalidOperationException("The selected patient was not found.");
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.PhoneNumber))
                return BadRequest(new { message = "First name, last name, email and phone number are required for a new patient." });

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            patient = await db.Patients.SingleOrDefaultAsync(x => x.PracticeId == practiceId && x.Email == normalizedEmail, cancellationToken)
                ?? new Patient
                {
                    PracticeId = practiceId,
                    FirstName = request.FirstName.Trim(),
                    LastName = request.LastName.Trim(),
                    Email = normalizedEmail,
                    PhoneNumber = request.PhoneNumber.Trim(),
                    PreferredContactMethod = "Email"
                };

            if (patient.PatientId == 0)
            {
                db.Patients.Add(patient);
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        var appointment = await bookingService.CreateAsync(patient.PatientId, request.DentistId, request.ServiceId, request.StartDateTime,
            request.BookingSource, request.PatientNotes, PaymentMethods.CashAtPractice, userId, cancellationToken);

        var result = await db.Appointments.AsNoTracking().Where(x => x.AppointmentId == appointment.AppointmentId)
            .Select(x => new AppointmentDto(x.AppointmentId, x.BookingReference, x.PatientId,
                x.Patient.FirstName + " " + x.Patient.LastName, x.DentistId,
                x.Dentist.Staff.FirstName + " " + x.Dentist.Staff.LastName,
                x.ServiceId, x.Service.Name, x.StartDateTime, x.EndDateTime, x.AppointmentStatus.Name,
                x.BookingSource, x.PatientNotes, x.CancellationReason, x.PaymentMethod, x.PaymentStatus,
                x.AmountDueAtBooking, x.AmountPaid, x.IsSecured, x.PaymentExpiresAtUtc)).SingleAsync(cancellationToken);

        return Ok(result);
    }

    [HttpPut("{id:int}/reschedule")]
    public async Task<IActionResult> Reschedule(int id, RescheduleAppointmentRequest request, CancellationToken ct)
    {
        var appointment = await db.Appointments.Include(x => x.AppointmentStatus).Include(x => x.Patient).SingleOrDefaultAsync(x => x.AppointmentId == id, ct);
        if (appointment is null) return NotFound();
        await bookingService.RescheduleAsync(appointment, request.NewStartDateTime, User.FindFirstValue(ClaimTypes.NameIdentifier), ct);
        return NoContent();
    }

    [HttpPost("{id:int}/payments/cash")]
    [Authorize(Roles = Roles.Receptionist + "," + Roles.Administrator)]
    public async Task<IActionResult> RecordCashPayment(int id, CashPaymentRequest request, CancellationToken cancellationToken)
    {
        if (decimal.Round(request.Amount, 2) != request.Amount) return BadRequest(new { message = "Use at most two decimal places for a cash amount." });
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        var appointment = await db.Appointments
            .Include(x => x.Patient)
            .Include(x => x.AppointmentStatus)
            .SingleOrDefaultAsync(x => x.AppointmentId == id, cancellationToken);
        if (appointment is null) return NotFound();

        if (appointment.PaymentMethod != PaymentMethods.CashAtPractice)
            return BadRequest(new { message = "This appointment is configured for PayFast, not cash at the practice." });
        if (appointment.AppointmentStatus.Code == AppointmentStatusCodes.Cancelled)
            return BadRequest(new { message = "A cash payment cannot be recorded against a cancelled appointment." });
        if (await db.AppointmentPayments.AnyAsync(x => x.AppointmentId == id && x.Status == PaymentStatuses.Paid, cancellationToken))
            return BadRequest(new { message = "Cash payment has already been recorded for this appointment." });

        var nowUtc = DateTime.UtcNow;
        var payment = new AppointmentPayment
        {
            AppointmentId = appointment.AppointmentId,
            Provider = "Practice",
            PaymentMethod = PaymentMethods.CashAtPractice,
            Status = PaymentStatuses.Paid,
            Amount = request.Amount,
            Currency = "ZAR",
            MerchantPaymentId = $"CASH-{appointment.AppointmentId}-{Guid.NewGuid():N}",
            AmountGross = request.Amount,
            AmountNet = request.Amount,
            PaidAtUtc = nowUtc,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };

        appointment.AmountPaid += request.Amount;
        appointment.PaymentStatus = PaymentStatuses.Paid;
        appointment.IsSecured = true;
        appointment.UpdatedAtUtc = nowUtc;
        db.AppointmentPayments.Add(payment);
        db.Notifications.Add(new Notification
        {
            PatientId = appointment.PatientId,
            AppointmentId = appointment.AppointmentId,
            NotificationType = "CashPaymentReceipt",
            Channel = "Email",
            Recipient = appointment.Patient.Email,
            Status = "Pending",
            CreatedAtUtc = nowUtc
        });

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(userId, "CASH_PAYMENT", "AppointmentPayment", payment.AppointmentPaymentId.ToString(), null,
            new { appointment.BookingReference, request.Amount, appointment.PaymentStatus, Notes = request.Notes }, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return NoContent();
    }

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateAppointmentStatusRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var code = request.StatusCode.Trim().ToUpperInvariant();
        var status = await db.AppointmentStatuses.SingleOrDefaultAsync(x => x.Code == code, cancellationToken);
        if (status is null) return BadRequest(new { message = "Unknown appointment status." });

        var appointment = await db.Appointments
            .Include(x => x.AppointmentStatus)
            .Include(x => x.Patient)
            .SingleOrDefaultAsync(x => x.AppointmentId == id, cancellationToken);
        if (appointment is null) return NotFound();

        if (appointment.PaymentMethod == PaymentMethods.PayFast && !appointment.IsSecured &&
            code is AppointmentStatusCodes.Confirmed or AppointmentStatusCodes.CheckedIn or AppointmentStatusCodes.InProgress or AppointmentStatusCodes.Completed)
            return BadRequest(new { message = "This PayFast appointment cannot move forward until PayFast confirms payment. Cancel it and create a cash booking instead if the patient will pay at the practice." });

        if (code == AppointmentStatusCodes.Cancelled)
        {
            await bookingService.CancelAsync(appointment, string.IsNullOrWhiteSpace(request.InternalNotes) ? "Cancelled by practice" : request.InternalNotes.Trim(), userId, cancellationToken);
            return NoContent();
        }

        var old = appointment.AppointmentStatus.Code;
        appointment.AppointmentStatusId = status.AppointmentStatusId;
        appointment.AppointmentStatus = status;
        appointment.InternalNotes = string.IsNullOrWhiteSpace(request.InternalNotes) ? appointment.InternalNotes : request.InternalNotes.Trim();
        appointment.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(userId, "STATUS_CHANGE", "Appointment", id.ToString(), new { Status = old }, new { Status = code }, cancellationToken);
        return NoContent();
    }
}
