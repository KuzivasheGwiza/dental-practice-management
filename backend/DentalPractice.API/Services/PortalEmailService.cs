using System.Net;
using System.Net.Mail;
using System.Text.Json;

namespace DentalPractice.API.Services;

public class PortalEmailService(IConfiguration configuration, IWebHostEnvironment environment)
{
    public async Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken = default)
    {
        if (!configuration.GetValue<bool>("Email:Enabled"))
        {
            if (!environment.IsDevelopment())
                throw new InvalidOperationException("Email delivery has not been configured.");
            var directory = configuration["Email:DevelopmentInboxPath"] ?? Path.Combine(environment.ContentRootPath, "App_Data", "DevelopmentInbox");
            Directory.CreateDirectory(directory);
            await File.WriteAllTextAsync(Path.Combine(directory, $"{Guid.NewGuid():N}.json"),
                JsonSerializer.Serialize(new { recipient, subject, body, createdAtUtc = DateTime.UtcNow }), cancellationToken);
            return;
        }
        using var client = new SmtpClient(configuration["Email:Host"], configuration.GetValue<int?>("Email:Port") ?? 587)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(configuration["Email:Username"], configuration["Email:Password"]),
            Timeout = 20000
        };
        using var message = new MailMessage(configuration["Email:From"]!, recipient, subject, body);
        await client.SendMailAsync(message, cancellationToken);
    }

    public string Link(string path, string email, string token)
    {
        var root = configuration["Portal:FrontendBaseUrl"] ?? "http://localhost:4200";
        return $"{root.TrimEnd('/')}/{path}?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
    }
}
