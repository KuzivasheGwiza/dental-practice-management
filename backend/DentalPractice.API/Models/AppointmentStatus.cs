namespace DentalPractice.API.Models;

public class AppointmentStatus
{
    public int AppointmentStatusId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }

    public ICollection<Appointment> Appointments { get; set; } = [];
}
