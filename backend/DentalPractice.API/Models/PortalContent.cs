namespace DentalPractice.API.Models;

public class PortalContent
{
    public int PortalContentId { get; set; }
    public string ConsultationInformation { get; set; } = "Consultations take place in person. Select a service to see its duration and booking payment. Contact reception for a full treatment estimate.";
    public string PreparationInstructions { get; set; } = "Arrive 10 minutes early and bring your identification and medical aid details, if applicable.";
    public string CancellationPolicy { get; set; } = "Contact reception for late changes and any refund requests. Refunds require review by the practice.";
    public string PrivacyNotice { get; set; } = "We use your contact details to manage appointments and send appointment notices. Contact the practice to request access, corrections or deletion where applicable. Do not submit clinical records through this booking portal.";
    public string Faqs { get; set; } = "How do I book?\nRegister, select a service and dentist, then choose an available time.\n\nCan I use medical aid?\nContact reception to confirm the practice's arrangements.\n\nHow are online payments confirmed?\nYour appointment is secured after PayFast confirms payment.";
    public int ChangeDeadlineHours { get; set; } = 24;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class PaymentRefund
{
    public int PaymentRefundId { get; set; }
    public int AppointmentId { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string ExternalReference { get; set; } = string.Empty;
    public string RecordedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
