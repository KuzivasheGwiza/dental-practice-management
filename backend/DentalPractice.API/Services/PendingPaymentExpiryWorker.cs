using DentalPractice.API.Constants;
using DentalPractice.API.Data;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Services;

public class PendingPaymentExpiryWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<PendingPaymentExpiryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExpirePendingPaymentsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to expire pending PayFast appointment reservations.");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task ExpirePendingPaymentsAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        var now = DateTime.UtcNow;

        var cancelledStatusId = await db.AppointmentStatuses
            .Where(x => x.Code == AppointmentStatusCodes.Cancelled)
            .Select(x => x.AppointmentStatusId)
            .SingleAsync(cancellationToken);

        var expiredAppointments = await db.Appointments
            .Include(x => x.AppointmentStatus)
            .Include(x => x.Patient)
            .Where(x => x.AppointmentStatus.Code == AppointmentStatusCodes.Pending &&
                        x.PaymentMethod == PaymentMethods.PayFast &&
                        !x.IsSecured &&
                        x.PaymentExpiresAtUtc != null &&
                        x.PaymentExpiresAtUtc <= now)
            .OrderBy(x => x.PaymentExpiresAtUtc)
            .ThenBy(x => x.AppointmentId)
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var appointment in expiredAppointments)
        {
            appointment.AppointmentStatusId = cancelledStatusId;
            appointment.PaymentStatus = PaymentStatuses.Expired;
            appointment.CancellationReason = "Online payment window expired";
            appointment.CancelledAtUtc = now;
            appointment.UpdatedAtUtc = now;

            var payments = await db.AppointmentPayments
                .Where(x => x.AppointmentId == appointment.AppointmentId && x.Status == PaymentStatuses.Pending)
                .ToListAsync(cancellationToken);
            foreach (var payment in payments)
            {
                payment.Status = PaymentStatuses.Expired;
                payment.FailureReason = "Online payment window expired.";
                payment.UpdatedAtUtc = now;
            }

            db.Notifications.Add(new Notification
            {
                PatientId = appointment.PatientId,
                AppointmentId = appointment.AppointmentId,
                NotificationType = "AppointmentPaymentExpired",
                Channel = "Email",
                Recipient = appointment.Patient.Email,
                Status = "Pending",
                CreatedAtUtc = now
            });

            await auditService.LogAsync(null, "PAYMENT_EXPIRED", "Appointment", appointment.AppointmentId.ToString(), null,
                new { appointment.BookingReference, appointment.PaymentStatus, appointment.CancellationReason }, cancellationToken);
        }

        if (expiredAppointments.Count > 0)
            await db.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
    }
}
