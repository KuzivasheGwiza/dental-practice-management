using System.Security.Claims;
using DentalPractice.API.Constants;
using DentalPractice.API.Data;
using DentalPractice.API.DTOs.Appointments;
using DentalPractice.API.DTOs.Payments;
using DentalPractice.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/appointments")]
[Authorize(Roles = Roles.Patient)]
public class AppointmentsController(
    ApplicationDbContext db,
    IBookingService bookingService,
    IPayFastService payFastService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<AppointmentDto>>> GetMine(CancellationToken cancellationToken)
    {
        var patientId = await GetPatientIdAsync(cancellationToken);
        return Ok(await AppointmentQuery(patientId).ToListAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var patientId = await GetPatientIdAsync(cancellationToken);
        var item = await AppointmentQuery(patientId, id).SingleOrDefaultAsync(cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<BookingResponseDto>> Create(CreateAppointmentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var patientId = await GetPatientIdAsync(cancellationToken);
        var appointment = await bookingService.CreateAsync(
            patientId,
            request.DentistId,
            request.ServiceId,
            request.StartDateTime,
            "Patient Portal",
            request.PatientNotes,
            request.PaymentMethod,
            userId,
            cancellationToken);

        var result = await AppointmentQuery(patientId, appointment.AppointmentId)
            .SingleAsync(cancellationToken);

        PayFastCheckoutDto? checkout = null;
        string message;
        if (appointment.PaymentMethod == PaymentMethods.PayFast)
        {
            var payment = await db.AppointmentPayments.AsNoTracking()
                .SingleAsync(x => x.AppointmentId == appointment.AppointmentId && x.Status == PaymentStatuses.Pending, cancellationToken);
            var patient = await db.Patients.AsNoTracking().SingleAsync(x => x.PatientId == patientId, cancellationToken);
            var service = await db.Services.AsNoTracking().SingleAsync(x => x.ServiceId == appointment.ServiceId, cancellationToken);
            checkout = payFastService.CreateCheckout(appointment, payment, patient, service);
            message = "Your appointment time is temporarily reserved. Complete the PayFast payment before the payment window expires to secure it.";
        }
        else
        {
            message = "Appointment confirmed. You selected cash payment at the practice.";
        }

        var response = new BookingResponseDto(result, checkout, message);
        return CreatedAtAction(nameof(GetById), new { id = result.AppointmentId }, response);
    }

    [HttpPut("{id:int}/reschedule")]
    public async Task<ActionResult<AppointmentDto>> Reschedule(int id, RescheduleAppointmentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var patientId = await GetPatientIdAsync(cancellationToken);
        var appointment = await db.Appointments
            .Include(x => x.AppointmentStatus)
            .Include(x => x.Patient)
            .SingleOrDefaultAsync(x => x.AppointmentId == id && x.PatientId == patientId, cancellationToken);
        if (appointment is null) return NotFound();
        if (!await CanChangeAsync(appointment.StartDateTime, cancellationToken))
            return BadRequest(new { message = "The online change deadline has passed. Contact reception for assistance." });

        await bookingService.RescheduleAsync(appointment, request.NewStartDateTime, userId, cancellationToken);
        var result = await AppointmentQuery(patientId, id).SingleAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, CancelAppointmentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var patientId = await GetPatientIdAsync(cancellationToken);
        var appointment = await db.Appointments
            .Include(x => x.AppointmentStatus)
            .Include(x => x.Patient)
            .SingleOrDefaultAsync(x => x.AppointmentId == id && x.PatientId == patientId, cancellationToken);
        if (appointment is null) return NotFound();
        if (!await CanChangeAsync(appointment.StartDateTime, cancellationToken))
            return BadRequest(new { message = "The online change deadline has passed. Contact reception for assistance." });

        await bookingService.CancelAsync(appointment, request.Reason, userId, cancellationToken);
        return NoContent();
    }

    private async Task<bool> CanChangeAsync(DateTime start, CancellationToken ct)
    {
        var hours = await db.PortalContents.Select(x => (int?)x.ChangeDeadlineHours).FirstOrDefaultAsync(ct) ?? 24;
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("South Africa Standard Time"));
        return start > now.AddHours(hours);
    }

    private async Task<int> GetPatientIdAsync(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        return await db.Patients.Where(x => x.UserId == userId).Select(x => x.PatientId).SingleAsync(cancellationToken);
    }

    private IQueryable<AppointmentDto> AppointmentQuery(int patientId, int? appointmentId = null) => db.Appointments.AsNoTracking()
        .Where(x => x.PatientId == patientId && (appointmentId == null || x.AppointmentId == appointmentId))
        .OrderByDescending(x => x.StartDateTime)
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
            x.PaymentExpiresAtUtc));
}
