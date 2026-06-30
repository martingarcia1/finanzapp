namespace FinanzApp.API.DTOs;

public record RecurringTransactionDto(
    Guid Id,
    Guid UserId,
    string Type,
    decimal Amount,
    string Category,
    string Description,
    string PaymentMethod,
    string Pattern,
    int[]? DaysOfWeek,
    int? DayOfMonth,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsActive,
    DateTime CreatedAt);

public record RecurringTransactionCreateDto(
    string Type,
    decimal Amount,
    string Category,
    string Description,
    string PaymentMethod,
    string Pattern,
    int[]? DaysOfWeek,
    int? DayOfMonth,
    DateOnly StartDate,
    DateOnly? EndDate);

public record RecurringTransactionUpdateDto(
    string Type,
    decimal Amount,
    string Category,
    string Description,
    string PaymentMethod,
    string Pattern,
    int[]? DaysOfWeek,
    int? DayOfMonth,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsActive);
