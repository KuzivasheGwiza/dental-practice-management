using System.ComponentModel.DataAnnotations;

namespace DentalPractice.API.DTOs.Admin;

public class ServiceUpsertRequest
{
    [Required, MaxLength(150)] public string Name { get; set; } = string.Empty;
    [MaxLength(1500)] public string? Description { get; set; }
    [Range(15, 480)] public int DefaultDurationMinutes { get; set; } = 30;
    [Range(0, 1000000)] public decimal? StartingPrice { get; set; }
    [Range(5, 1000000)] public decimal? BookingPaymentAmount { get; set; }
    public bool IsEmergencyService { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}
