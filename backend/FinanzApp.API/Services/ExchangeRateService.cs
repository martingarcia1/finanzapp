using System.Text.Json.Serialization;
using FinanzApp.API.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace FinanzApp.API.Services;

/// <summary>
/// Cotizaciones del dólar en Argentina (oficial, blue, MEP, CCL, tarjeta, cripto, mayorista)
/// obtenidas de dolarapi.com. Se cachean para no golpear la API externa en cada request y,
/// si la fuente falla, se devuelve la última cotización conocida marcada como desactualizada.
/// </summary>
public class ExchangeRateService(
    HttpClient http,
    IMemoryCache cache,
    IConfiguration config,
    ILogger<ExchangeRateService> logger)
{
    private const string FreshKey = "exchange_rates_fresh";
    private const string LastKnownKey = "exchange_rates_last_known";

    // Orden en que se muestran en la UI
    private static readonly string[] Order =
        ["oficial", "blue", "bolsa", "contadoconliqui", "tarjeta", "cripto", "mayorista"];

    public async Task<ExchangeRatesResponse?> GetDollarRatesAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue<ExchangeRatesResponse>(FreshKey, out var fresh) && fresh is not null)
            return fresh;

        try
        {
            var raw = await http.GetFromJsonAsync<List<DolarApiRate>>("dolares", ct) ?? [];

            var rates = raw
                .Where(r => r.Venta is > 0)
                .OrderBy(r => { var i = Array.IndexOf(Order, r.Casa); return i < 0 ? int.MaxValue : i; })
                .Select(r => new ExchangeRateDto(
                    r.Casa,
                    r.Casa == "bolsa" ? "MEP" : r.Nombre,
                    r.Compra,
                    r.Venta!.Value,
                    r.FechaActualizacion))
                .ToList();

            var response = new ExchangeRatesResponse(rates, DateTime.UtcNow, Stale: false);

            var ttl = TimeSpan.FromSeconds(config.GetValue("ExchangeRates:CacheSeconds", 300));
            cache.Set(FreshKey, response, ttl);
            cache.Set(LastKnownKey, response);
            return response;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            logger.LogWarning(ex, "No se pudieron obtener las cotizaciones de dolarapi.com");

            return cache.TryGetValue<ExchangeRatesResponse>(LastKnownKey, out var last) && last is not null
                ? last with { Stale = true }
                : null;
        }
    }

    private sealed record DolarApiRate(
        [property: JsonPropertyName("casa")] string Casa,
        [property: JsonPropertyName("nombre")] string Nombre,
        [property: JsonPropertyName("compra")] decimal? Compra,
        [property: JsonPropertyName("venta")] decimal? Venta,
        [property: JsonPropertyName("fechaActualizacion")] DateTime FechaActualizacion);
}
