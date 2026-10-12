namespace FinanzApp.API.Models;

public static class Currencies
{
    public const string ARS = "ARS";
    public const string USD = "USD";

    /// <summary>Devuelve el código normalizado (ARS/USD) o null si no es una moneda soportada.</summary>
    public static string? Normalize(string? code) =>
        code?.Trim().ToUpperInvariant() switch
        {
            null or "" or ARS => ARS,
            USD => USD,
            _ => null,
        };
}
