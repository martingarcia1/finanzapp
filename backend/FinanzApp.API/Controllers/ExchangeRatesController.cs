using FinanzApp.API.DTOs;
using FinanzApp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinanzApp.API.Controllers;

[Authorize]
[ApiController]
[Route("api/exchange-rates")]
public class ExchangeRatesController(ExchangeRateService rates) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ExchangeRatesResponse>> Get(CancellationToken ct)
    {
        var result = await rates.GetDollarRatesAsync(ct);
        if (result is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Las cotizaciones no están disponibles en este momento." });

        return Ok(result);
    }
}
