using Microsoft.AspNetCore.Identity;

namespace DentalPractice.API.Models;

public class ApplicationUser : IdentityUser
{
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? ProfileImageFileName { get; set; }
    public string? ProfileImageContentType { get; set; }
    public DateTime? ProfileImageUpdatedAtUtc { get; set; }

    public Patient? Patient { get; set; }
    public Staff? Staff { get; set; }
    public ICollection<AuditLog> AuditLogs { get; set; } = [];
}
