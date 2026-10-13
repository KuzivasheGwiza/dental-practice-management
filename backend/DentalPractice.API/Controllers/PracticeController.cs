using DentalPractice.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/practice")]
public class PracticeController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var practice = await db.Practices.AsNoTracking()
            .Include(x => x.PracticeHours)
            .FirstAsync(x => x.IsActive, cancellationToken);

        return Ok(new
        {
            practice.PracticeId,
            practice.Name,
            practice.TradingName,
            practice.Phone,
            practice.WhatsAppNumber,
            practice.Email,
            practice.AddressLine1,
            practice.AddressLine2,
            practice.City,
            practice.Province,
            practice.PostalCode,
            practice.LogoUrl,
            practice.WebsiteUrl,
            Hours = practice.PracticeHours
                .OrderBy(h => h.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)h.DayOfWeek)
                .Select(h => new
                {
                    Day = h.DayOfWeek.ToString(),
                    h.OpeningTime,
                    h.ClosingTime,
                    h.IsClosed
                })
        });
    }
}
