using System.Text.Json;
using DentalPractice.API.Data;
using DentalPractice.API.Interfaces;
using DentalPractice.API.Models;
using Microsoft.AspNetCore.Http;

namespace DentalPractice.API.Services;

public class AuditService(ApplicationDbContext db, IHttpContextAccessor httpContextAccessor) : IAuditService
{
    public async Task LogAsync(string? userId, string action, string entityType, string? entityId, object? oldValues = null, object? newValues = null, CancellationToken cancellationToken = default)
    {
        var request = httpContextAccessor.HttpContext?.Request;
        var log = new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValues = oldValues is null ? null : JsonSerializer.Serialize(oldValues),
            NewValues = newValues is null ? null : JsonSerializer.Serialize(newValues),
            IpAddress = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = request?.Headers.UserAgent.ToString(),
            CreatedAtUtc = DateTime.UtcNow
        };

        db.AuditLogs.Add(log);
        await db.SaveChangesAsync(cancellationToken);
    }
}
