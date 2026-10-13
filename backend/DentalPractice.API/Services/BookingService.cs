using System.Data;
using DentalPractice.API.Constants;
using DentalPractice.API.Data;
using DentalPractice.API.DTOs.Appointments;
using DentalPractice.API.Helpers;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using DentalPractice.API.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DentalPractice.API.Services;

public class BookingService(
    ApplicationDbContext db,
    IConfiguration configuration,
    IAuditService auditService,
    IPayFastService payFastService,
    IOptions<PayFastOptions> payFastOptions) : IBookingService
{
    private readonly PayFastOptions _payFastOptions = payFastOptions.Value;

    public async Task<IReadOnlyCollection<AvailabilitySlotDto>> GetAvailableSlotsAsync(
        int dentistId,
        int serviceId,
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        if (date < DateOnly.FromDateTime(DateTime.Today))
            return Array.Empty<AvailabilitySlotDto>();

        var dentistService = await db.DentistServices
            .AsNoTracking()
            .Include(x => x.Service)
            .Include(x => x.Dentist)
            .ThenInclude(x => x.Staff)
            .SingleOrDefaultAsync(x => x.DentistId == dentistId && x.ServiceId == serviceId && x.IsActive && x.Service.IsActive && x.Dentist.IsActive, cancellationToken);

        if (dentistService is null)
            return Array.Empty<AvailabilitySlotDto>();

        var practiceHours = await db.PracticeHours
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.PracticeId == dentistService.Service.PracticeId && x.DayOfWeek == date.DayOfWeek, cancellationToken);

        if (practiceHours is null || practiceHours.IsClosed || practiceHours.OpeningTime is null || practiceHours.ClosingTime is null)
            return Array.Empty<AvailabilitySlotDto>();

        var blocks = await db.DentistAvailabilities
            .AsNoTracking()
            .Where(x => x.DentistId == dentistId && x.IsActive && x.DayOfWeek == date.DayOfWeek && x.EffectiveFrom <= date && (x.EffectiveTo == null || x.EffectiveTo >= date))
            .OrderBy(x => x.StartTime)
            .ToListAsync(cancellationToken);

        if (blocks.Count == 0)
            return Array.Empty<AvailabilitySlotDto>();

        var dayStart = date.ToDateTime(TimeOnly.MinValue);
        var dayEnd = dayStart.AddDays(1);
        var nowUtc = DateTime.UtcNow;

        var exceptions = await db.AvailabilityExceptions
            .AsNoTracking()
            .Where(x => x.DentistId == dentistId && x.StartDateTime < dayEnd && x.EndDateTime > dayStart)
            .ToListAsync(cancellationToken);

        var appointments = await db.Appointments
            .AsNoTracking()
            .Include(x => x.AppointmentStatus)
            .Where(x => x.DentistId == dentistId && x.StartDateTime < dayEnd && x.EndDateTime > dayStart &&
                        AppointmentStatusCodes.ActiveBlocking.Contains(x.AppointmentStatus.Code) &&
                        (x.AppointmentStatus.Code != AppointmentStatusCodes.Pending || x.PaymentExpiresAtUtc == null || x.PaymentExpiresAtUtc > nowUtc))
            .ToListAsync(cancellationToken);

        var duration = dentistService.CustomDurationMinutes ?? dentistService.Service.DefaultDurationMinutes;
        var interval = Math.Max(5, configuration.GetValue<int?>("Booking:SlotIntervalMinutes") ?? 15);
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("South Africa Standard Time"));
        var slots = new List<AvailabilitySlotDto>();

        foreach (var block in blocks)
        {
            var blockStartTime = block.StartTime > practiceHours.OpeningTime.Value ? block.StartTime : practiceHours.OpeningTime.Value;
            var blockEndTime = block.EndTime < practiceHours.ClosingTime.Value ? block.EndTime : practiceHours.ClosingTime.Value;
            var cursor = date.ToDateTime(blockStartTime);
            var blockEnd = date.ToDateTime(blockEndTime);

            while (cursor.AddMinutes(duration) <= blockEnd)
            {
                var end = cursor.AddMinutes(duration);
                var isFuture = cursor > now;
                var blockedByException = exceptions.Any(x => cursor < x.EndDateTime && end > x.StartDateTime);
                var blockedByAppointment = appointments.Any(x => cursor < x.EndDateTime && end > x.StartDateTime);

                if (isFuture && !blockedByException && !blockedByAppointment)
                    slots.Add(new AvailabilitySlotDto(cursor, end));

                cursor = cursor.AddMinutes(interval);
            }
        }

        return slots;
    }

    public async Task<Appointment> CreateAsync(
        int patientId,
        int dentistId,
        int serviceId,
        DateTime startDateTime,
        string bookingSource,
        string? patientNotes,
        string paymentMethod,
        string? createdByUserId,
        CancellationToken cancellationToken = default)
    {
        paymentMethod = (paymentMethod ?? string.Empty).Trim().ToUpperInvariant();
        if (!PaymentMethods.All.Contains(paymentMethod))
            throw new InvalidOperationException("Choose either PayFast online payment or cash at the practice.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        var duration = await ValidateSlotAsync(dentistId, serviceId, startDateTime, null, cancellationToken);
        var service = await db.Services.SingleAsync(x => x.ServiceId == serviceId, cancellationToken);
        var patientPracticeId = await db.Patients.Where(x => x.PatientId == patientId && x.IsActive).Select(x => x.PracticeId).SingleOrDefaultAsync(cancellationToken);
        if (patientPracticeId == 0 || patientPracticeId != service.PracticeId)
            throw new InvalidOperationException("The patient and selected service do not belong to the same practice.");

        var isPayFast = paymentMethod == PaymentMethods.PayFast;
        if (isPayFast)
        {
            if (!payFastService.IsConfigured(out var reason))
                throw new InvalidOperationException(reason);
            if (!service.BookingPaymentAmount.HasValue || service.BookingPaymentAmount.Value < 5m)
                throw new InvalidOperationException("Online payment is not available for this service because the practice has not configured a valid booking payment amount (minimum R5.00). You can choose cash at the practice instead.");
        }

        var statusCode = isPayFast ? AppointmentStatusCodes.Pending : AppointmentStatusCodes.Confirmed;
        var status = await db.AppointmentStatuses.SingleAsync(x => x.Code == statusCode, cancellationToken);
        var paymentWindowMinutes = Math.Clamp(_payFastOptions.PaymentWindowMinutes, 5, 60);
        var paymentExpiresAtUtc = isPayFast ? DateTime.UtcNow.AddMinutes(paymentWindowMinutes) : (DateTime?)null;
        var bookingReference = BookingReferenceGenerator.Create();

        var appointment = new Appointment
        {
            PracticeId = service.PracticeId,
            BookingReference = bookingReference,
            PatientId = patientId,
            DentistId = dentistId,
            ServiceId = serviceId,
            AppointmentStatusId = status.AppointmentStatusId,
            StartDateTime = startDateTime,
            EndDateTime = startDateTime.AddMinutes(duration),
            BookingSource = string.IsNullOrWhiteSpace(bookingSource) ? "Patient Portal" : bookingSource.Trim(),
            PatientNotes = string.IsNullOrWhiteSpace(patientNotes) ? null : patientNotes.Trim(),
            PaymentMethod = paymentMethod,
            PaymentStatus = isPayFast ? PaymentStatuses.Pending : PaymentStatuses.CashDue,
            AmountDueAtBooking = isPayFast ? service.BookingPaymentAmount!.Value : 0m,
            AmountPaid = 0m,
            IsSecured = !isPayFast,
            PaymentExpiresAtUtc = paymentExpiresAtUtc,
            CreatedByUserId = createdByUserId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);

        if (isPayFast)
        {
            db.AppointmentPayments.Add(new AppointmentPayment
            {
                AppointmentId = appointment.AppointmentId,
                Provider = "PayFast",
                PaymentMethod = PaymentMethods.PayFast,
                Status = PaymentStatuses.Pending,
                Amount = appointment.AmountDueAtBooking,
                Currency = "ZAR",
                MerchantPaymentId = $"APT-{appointment.AppointmentId}-{Guid.NewGuid():N}",
                ExpiresAtUtc = paymentExpiresAtUtc,
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }

        var patient = await db.Patients.AsNoTracking().SingleAsync(x => x.PatientId == patientId, cancellationToken);
        db.Notifications.Add(new Notification
        {
            PatientId = patientId,
            AppointmentId = appointment.AppointmentId,
            NotificationType = isPayFast ? "AppointmentPaymentRequired" : "AppointmentConfirmation",
            Channel = "Email",
            Recipient = patient.Email,
            Status = "Pending",
            CreatedAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(createdByUserId, "CREATE", "Appointment", appointment.AppointmentId.ToString(), null,
            new
            {
                appointment.BookingReference,
                appointment.PatientId,
                appointment.DentistId,
                appointment.ServiceId,
                appointment.StartDateTime,
                appointment.PaymentMethod,
                appointment.PaymentStatus,
                appointment.AmountDueAtBooking,
                appointment.IsSecured
            }, cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return appointment;
    }

    public async Task<Appointment> RescheduleAsync(Appointment appointment, DateTime newStartDateTime, string? userId, CancellationToken cancellationToken = default)
    {
        if (appointment.AppointmentStatus.Code is AppointmentStatusCodes.Cancelled or AppointmentStatusCodes.Completed or AppointmentStatusCodes.NoShow)
            throw new InvalidOperationException("This appointment cannot be rescheduled in its current status.");

        if (appointment.AppointmentStatus.Code == AppointmentStatusCodes.Pending && appointment.PaymentExpiresAtUtc <= DateTime.UtcNow)
            throw new InvalidOperationException("The online payment window for this appointment has expired. Please create a new booking.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var duration = await ValidateSlotAsync(appointment.DentistId, appointment.ServiceId, newStartDateTime, appointment.AppointmentId, cancellationToken);
        var old = new { appointment.StartDateTime, appointment.EndDateTime };
        var reminders = await db.Notifications.Where(x => x.AppointmentId == appointment.AppointmentId && x.NotificationType == "AppointmentReminder").ToListAsync(cancellationToken);
        foreach (var reminder in reminders) { reminder.NotificationType = "PreviousAppointmentReminder"; if (reminder.Status == "Pending") reminder.Status = "Superseded"; }


        appointment.StartDateTime = newStartDateTime;
        appointment.EndDateTime = newStartDateTime.AddMinutes(duration);
        appointment.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        db.Notifications.Add(new Notification
        {
            PatientId = appointment.PatientId,
            AppointmentId = appointment.AppointmentId,
            NotificationType = "AppointmentRescheduled",
            Channel = "Email",
            Recipient = appointment.Patient.Email,
            Status = "Pending",
            CreatedAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);

        await auditService.LogAsync(userId, "RESCHEDULE", "Appointment", appointment.AppointmentId.ToString(), old,
            new { appointment.StartDateTime, appointment.EndDateTime }, cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return appointment;
    }

    public async Task CancelAsync(Appointment appointment, string reason, string? userId, CancellationToken cancellationToken = default)
    {
        if (appointment.AppointmentStatus.Code == AppointmentStatusCodes.Cancelled)
            return;

        if (appointment.AppointmentStatus.Code is AppointmentStatusCodes.Completed or AppointmentStatusCodes.NoShow)
            throw new InvalidOperationException("This appointment can no longer be cancelled.");

        var cancelledStatus = await db.AppointmentStatuses.SingleAsync(x => x.Code == AppointmentStatusCodes.Cancelled, cancellationToken);
        var oldStatus = appointment.AppointmentStatus.Code;
        appointment.AppointmentStatusId = cancelledStatus.AppointmentStatusId;
        appointment.AppointmentStatus = cancelledStatus;
        appointment.CancellationReason = reason.Trim();
        appointment.CancelledAtUtc = DateTime.UtcNow;
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        if (appointment.PaymentStatus == PaymentStatuses.Pending)
        {
            appointment.PaymentStatus = PaymentStatuses.Cancelled;
            var pendingPayments = await db.AppointmentPayments
                .Where(x => x.AppointmentId == appointment.AppointmentId && x.Status == PaymentStatuses.Pending)
                .ToListAsync(cancellationToken);
            foreach (var payment in pendingPayments)
            {
                payment.Status = PaymentStatuses.Cancelled;
                payment.FailureReason = reason.Trim();
                payment.UpdatedAtUtc = DateTime.UtcNow;
            }
        }

        db.Notifications.Add(new Notification
        {
            PatientId = appointment.PatientId,
            AppointmentId = appointment.AppointmentId,
            NotificationType = appointment.AmountPaid > 0 ? "AppointmentCancellationPaymentReview" : "AppointmentCancellation",
            Channel = "Email",
            Recipient = appointment.Patient.Email,
            Status = "Pending",
            CreatedAtUtc = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        await auditService.LogAsync(userId, "CANCEL", "Appointment", appointment.AppointmentId.ToString(), new { Status = oldStatus },
            new { Status = AppointmentStatusCodes.Cancelled, Reason = reason, appointment.PaymentStatus, appointment.AmountPaid }, cancellationToken);
    }

    private async Task<int> ValidateSlotAsync(int dentistId, int serviceId, DateTime startDateTime, int? excludeAppointmentId, CancellationToken cancellationToken)
    {
        if (startDateTime <= TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("South Africa Standard Time")))
            throw new InvalidOperationException("Appointments must be booked in the future.");

        var dentistService = await db.DentistServices
            .Include(x => x.Service)
            .Include(x => x.Dentist)
            .SingleOrDefaultAsync(x => x.DentistId == dentistId && x.ServiceId == serviceId && x.IsActive && x.Service.IsActive && x.Dentist.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("The selected dentist does not offer this service.");

        var duration = dentistService.CustomDurationMinutes ?? dentistService.Service.DefaultDurationMinutes;
        var endDateTime = startDateTime.AddMinutes(duration);
        var date = DateOnly.FromDateTime(startDateTime);
        var startTime = TimeOnly.FromDateTime(startDateTime);
        var endTime = TimeOnly.FromDateTime(endDateTime);

        if (DateOnly.FromDateTime(endDateTime) != date)
            throw new InvalidOperationException("The appointment cannot cross into another day.");

        var practiceHours = await db.PracticeHours.SingleOrDefaultAsync(x => x.PracticeId == dentistService.Service.PracticeId && x.DayOfWeek == startDateTime.DayOfWeek, cancellationToken);
        if (practiceHours is null || practiceHours.IsClosed || practiceHours.OpeningTime is null || practiceHours.ClosingTime is null || startTime < practiceHours.OpeningTime || endTime > practiceHours.ClosingTime)
            throw new InvalidOperationException("The selected time falls outside practice operating hours.");

        var insideDentistAvailability = await db.DentistAvailabilities.AnyAsync(x =>
            x.DentistId == dentistId && x.IsActive && x.DayOfWeek == startDateTime.DayOfWeek && x.EffectiveFrom <= date &&
            (x.EffectiveTo == null || x.EffectiveTo >= date) && x.StartTime <= startTime && x.EndTime >= endTime, cancellationToken);

        if (!insideDentistAvailability)
            throw new InvalidOperationException("The dentist is not available at the selected time.");

        var hasException = await db.AvailabilityExceptions.AnyAsync(x =>
            x.DentistId == dentistId && startDateTime < x.EndDateTime && endDateTime > x.StartDateTime, cancellationToken);
        if (hasException)
            throw new InvalidOperationException("The selected time has been blocked by the practice.");

        var nowUtc = DateTime.UtcNow;
        var hasOverlap = await db.Appointments
            .Include(x => x.AppointmentStatus)
            .AnyAsync(x => x.DentistId == dentistId && x.AppointmentId != excludeAppointmentId &&
                           AppointmentStatusCodes.ActiveBlocking.Contains(x.AppointmentStatus.Code) &&
                           (x.AppointmentStatus.Code != AppointmentStatusCodes.Pending || x.PaymentExpiresAtUtc == null || x.PaymentExpiresAtUtc > nowUtc) &&
                           startDateTime < x.EndDateTime && endDateTime > x.StartDateTime, cancellationToken);

        if (hasOverlap)
            throw new InvalidOperationException("That appointment time is no longer available.");

        return duration;
    }
}
