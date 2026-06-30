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
    DateTime CreatedAt);

public record DebtCreateDto(
    string Direction,
    string PersonName,
    decimal Amount,
    string Description,
    DateOnly? DueDate);

public record DebtUpdateDto(
    string Direction,
    string PersonName,
    decimal Amount,
    decimal OriginalAmount,
    string Description,
    DateOnly? DueDate,
    bool IsPaid);

public record DebtPaymentDto(decimal Amount);
