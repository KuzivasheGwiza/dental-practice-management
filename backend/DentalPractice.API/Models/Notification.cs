namespace DentalPractice.API.Models;

public class Notification
{
    public int NotificationId { get; set; }
    public int PatientId { get; set; }
    public int? AppointmentId { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public string Channel { get; set; } = "Email";
    public string Recipient { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public DateTime? ScheduledFor { get; set; }
    public DateTime? SentAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
    public Appointment? Appointment { get; set; }
}
