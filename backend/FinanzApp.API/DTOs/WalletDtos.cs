namespace FinanzApp.API.DTOs;

public record WalletDto(
    Guid Id,
    Guid UserId,
    string Name,
    string Type,
    decimal Balance,
    string Color,
    string Description,
    DateTime CreatedAt,
    string Currency);

public record WalletCreateDto(
    string Name,
    string Type,
    decimal Balance,
    string Color,
    string Description,
    string Currency = "ARS");

public record WalletUpdateDto(
    string Name,
    string Type,
    decimal Balance,
    string Color,
    string Description,
    string Currency = "ARS");

public record WalletAdjustDto(decimal Delta);

// ToAmount: monto acreditado en destino cuando las monedas difieren (compra/venta de dólares)
public record WalletTransferDto(Guid FromWalletId, Guid ToWalletId, decimal Amount, decimal? ToAmount = null);
