namespace DentalPractice.API.Models;

public class Dentist
{
    public int DentistId { get; set; }
    public int StaffId { get; set; }
    public string? ProfessionalNumber { get; set; }
    public string? Qualifications { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
    public bool IsActive { get; set; } = true;

    public Staff Staff { get; set; } = null!;
    public ICollection<DentistService> DentistServices { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
    public ICollection<DentistAvailability> Availability { get; set; } = [];
    public ICollection<AvailabilityException> AvailabilityExceptions { get; set; } = [];
}
