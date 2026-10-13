namespace DentalPractice.API.Interfaces;

public interface IAuditService
{
    Task LogAsync(string? userId, string action, string entityType, string? entityId, object? oldValues = null, object? newValues = null, CancellationToken cancellationToken = default);
}
