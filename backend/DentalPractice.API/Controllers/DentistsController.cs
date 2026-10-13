using DentalPractice.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/dentists")]
public class DentistsController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int? serviceId, CancellationToken cancellationToken)
    {
        var query = db.Dentists.AsNoTracking().Where(x => x.IsActive && x.Staff.IsActive);
        if (serviceId.HasValue)
            query = query.Where(x => x.DentistServices.Any(ds => ds.ServiceId == serviceId && ds.IsActive && ds.Service.IsActive));

        var dentists = await query
            .OrderBy(x => x.Staff.FirstName).ThenBy(x => x.Staff.LastName)
            .Select(x => new
            {
                x.DentistId,
                Name = $"{x.Staff.FirstName} {x.Staff.LastName}",
                x.ProfessionalNumber,
                x.Qualifications,
                x.Bio,
                x.ProfileImageUrl,
                Services = x.DentistServices.Where(ds => ds.IsActive && ds.Service.IsActive).Select(ds => new
                {
                    ds.ServiceId,
                    ds.Service.Name,
                    DurationMinutes = ds.CustomDurationMinutes ?? ds.Service.DefaultDurationMinutes
                })
            }).ToListAsync(cancellationToken);

        return Ok(dentists);
    }
}
