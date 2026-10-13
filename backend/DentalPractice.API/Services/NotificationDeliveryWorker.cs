using DentalPractice.API.Data;
using DentalPractice.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Services;

public class NotificationDeliveryWorker(IServiceScopeFactory scopes, IConfiguration configuration, ILogger<NotificationDeliveryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var email = scope.ServiceProvider.GetRequiredService<PortalEmailService>();
                var zone = TimeZoneInfo.FindSystemTimeZoneById("South Africa Standard Time");
                var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);
                var tomorrow = now.AddHours(24);
                var appointments = await db.Appointments.Include(x => x.Patient)
                    .Where(x => x.StartDateTime > now && x.StartDateTime <= tomorrow && x.IsSecured &&
                        x.AppointmentStatus.Code == "CONFIRMED" && !db.Notifications.Any(n => n.AppointmentId == x.AppointmentId && n.NotificationType == "AppointmentReminder"))
                    .ToListAsync(stoppingToken);
                foreach (var appointment in appointments)
                    db.Notifications.Add(new Notification { PatientId = appointment.PatientId, AppointmentId = appointment.AppointmentId,
                        Recipient = appointment.Patient.Email, NotificationType = "AppointmentReminder", ScheduledFor = DateTime.UtcNow });
                await db.SaveChangesAsync(stoppingToken);
                var queue = await db.Notifications.Include(x => x.Appointment).ThenInclude(x => x!.Service)
                    .Include(x => x.Appointment).ThenInclude(x => x!.Practice)
                    .Include(x => x.Appointment).ThenInclude(x => x!.AppointmentStatus)
                    .Where(x => x.Status == "Pending" && (x.ScheduledFor == null || x.ScheduledFor <= DateTime.UtcNow))
                    .OrderBy(x => x.NotificationId).Take(25).ToListAsync(stoppingToken);
                foreach (var notice in queue)
                {
                    if (notice.Channel != "Email") continue;
                    try
                    {
                        var appointment = notice.Appointment;
                        var content = await db.PortalContents.OrderBy(x => x.PortalContentId).FirstOrDefaultAsync(stoppingToken);
                        var body = appointment is null ? "Please contact reception for details." :
                            $"Reference: {appointment.BookingReference}\nStatus: {appointment.AppointmentStatus.Name}\nService: {appointment.Service.Name}\nAppointment: {appointment.StartDateTime:yyyy-MM-dd HH:mm} (South Africa)\nLocation: {appointment.Practice.Name}, {appointment.Practice.AddressLine1}, {appointment.Practice.City}\nPayment received: R{appointment.AmountPaid:F2}\n\n{content?.PreparationInstructions}\n\nSign in to the patient portal for current details and payment statements.";
                        await email.SendAsync(notice.Recipient, notice.NotificationType, body, stoppingToken);
                        notice.Status = configuration.GetValue<bool>("Email:Enabled") ? "Sent" : "DevelopmentInbox";
                        notice.SentAtUtc = DateTime.UtcNow;
                        await db.SaveChangesAsync(stoppingToken);
                    }
                    catch (Exception error) when (error is not OperationCanceledException)
                    {
                        logger.LogWarning("Notification {Id} delivery failed ({Type}); it remains queued for retry.", notice.NotificationId, error.GetType().Name);
                    }
                }
            }
            catch (Exception error) when (error is not OperationCanceledException)
            {
                logger.LogWarning("Notification processing failed ({Type}).", error.GetType().Name);
            }
            await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue<int?>("Notifications:PollSeconds") ?? 60, 5, 3600)), stoppingToken);
        }
    }
}
