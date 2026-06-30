namespace FinanzApp.API.DTOs;

public record WalletDto(
    Guid Id,
    Guid UserId,
    string Name,
    string Type,
    decimal Balance,
    string Color,
    string Description,
    DateTime CreatedAt);

public record WalletCreateDto(
    string Name,
    string Type,
    decimal Balance,
    string Color,
    string Description);

public record WalletUpdateDto(
    string Name,
    string Type,
    decimal Balance,
    string Color,
    string Description);

public record WalletAdjustDto(decimal Delta);

public record WalletTransferDto(Guid FromWalletId, Guid ToWalletId, decimal Amount);
