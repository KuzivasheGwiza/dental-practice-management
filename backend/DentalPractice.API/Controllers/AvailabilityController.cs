using DentalPractice.API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DentalPractice.API.Controllers;

[ApiController]
[Route("api/availability")]
public class AvailabilityController(IBookingService bookingService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int dentistId, [FromQuery] int serviceId, [FromQuery] DateOnly date, CancellationToken cancellationToken)
        => Ok(await bookingService.GetAvailableSlotsAsync(dentistId, serviceId, date, cancellationToken));
}
