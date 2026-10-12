namespace FinanzApp.API.DTOs;

public record DebtDto(
    Guid Id,
    Guid UserId,
    string Direction,
    string PersonName,
    decimal Amount,
    decimal OriginalAmount,
    string Description,
    DateOnly? DueDate,
    bool IsPaid,
    DateTime? PaidAt,
    DateTime CreatedAt,
    string Currency);

public record DebtCreateDto(
    string Direction,
    string PersonName,
    decimal Amount,
    string Description,
    DateOnly? DueDate,
    string Currency = "ARS");

public record DebtUpdateDto(
    string Direction,
    string PersonName,
    decimal Amount,
    decimal OriginalAmount,
    string Description,
    DateOnly? DueDate,
    bool IsPaid,
    string Currency = "ARS");

public record DebtPaymentDto(decimal Amount);
