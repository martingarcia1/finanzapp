namespace FinanzApp.API.DTOs;

public record FixedExpenseDto(
    Guid Id,
    Guid UserId,
    string Name,
    decimal Amount,
    string Category,
    int DayOfMonth,
    string Description,
    bool IsActive,
    DateTime CreatedAt);

public record FixedExpenseCreateDto(
    string Name,
    decimal Amount,
    string Category,
    int DayOfMonth,
    string Description);

public record FixedExpenseUpdateDto(
    string Name,
    decimal Amount,
    string Category,
    int DayOfMonth,
    string Description,
    bool IsActive);
