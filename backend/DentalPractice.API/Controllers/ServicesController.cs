using DentalPractice.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/services")]
public class ServicesController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var services = await db.Services.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name)
            .Select(x => new
            {
                x.ServiceId,
                x.Name,
                x.Description,
                x.DefaultDurationMinutes,
                x.StartingPrice,
                x.BookingPaymentAmount,
                x.IsEmergencyService
            }).ToListAsync(cancellationToken);
        return Ok(services);
    }
}
