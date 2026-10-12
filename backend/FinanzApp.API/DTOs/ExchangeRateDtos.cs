namespace FinanzApp.API.DTOs;

/// <summary>Code: oficial | blue | bolsa (MEP) | contadoconliqui | tarjeta | cripto | mayorista</summary>
public record ExchangeRateDto(
    string Code,
    string Name,
    decimal? Buy,
    decimal Sell,
    DateTime UpdatedAt);

public record ExchangeRatesResponse(
    List<ExchangeRateDto> Rates,
    DateTime FetchedAt,
    bool Stale);
