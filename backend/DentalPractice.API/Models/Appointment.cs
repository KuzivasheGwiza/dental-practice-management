namespace DentalPractice.API.Models;

public class Appointment
{
    public int AppointmentId { get; set; }
    public int PracticeId { get; set; }
    public string BookingReference { get; set; } = string.Empty;
    public int PatientId { get; set; }
    public int DentistId { get; set; }
    public int ServiceId { get; set; }
    public int AppointmentStatusId { get; set; }
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    public string BookingSource { get; set; } = "Patient Portal";
    public string? PatientNotes { get; set; }
    public string? InternalNotes { get; set; }
    public string? CancellationReason { get; set; }
    public string PaymentMethod { get; set; } = "CASH_AT_PRACTICE";
    public string PaymentStatus { get; set; } = "CASH_DUE";
    public decimal AmountDueAtBooking { get; set; }
    public decimal AmountPaid { get; set; }
    public bool IsSecured { get; set; }
    public DateTime? PaymentExpiresAtUtc { get; set; }
    public string? CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CancelledAtUtc { get; set; }

    public Practice Practice { get; set; } = null!;
    public Patient Patient { get; set; } = null!;
    public Dentist Dentist { get; set; } = null!;
    public Service Service { get; set; } = null!;
    public AppointmentStatus AppointmentStatus { get; set; } = null!;
    public ICollection<Notification> Notifications { get; set; } = [];
    public ICollection<AppointmentPayment> Payments { get; set; } = [];
}
