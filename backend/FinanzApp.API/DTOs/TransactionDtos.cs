namespace FinanzApp.API.DTOs;

public record TransactionDto(
    Guid Id,
    Guid UserId,
    string Type,
    decimal Amount,
    string Category,
    string Description,
    DateOnly Date,
    string PaymentMethod,
    DateTime CreatedAt,
    string Currency,
    decimal? ExchangeRate);

public record TransactionCreateDto(
    string Type,
    decimal Amount,
    string Category,
    string Description,
    DateOnly Date,
    string PaymentMethod,
    string Currency = "ARS",
    decimal? ExchangeRate = null);

public record TransactionUpdateDto(
    string Type,
    decimal Amount,
    string Category,
    string Description,
    DateOnly Date,
    string PaymentMethod,
    string Currency = "ARS",
    decimal? ExchangeRate = null);
