namespace FinanzApp.API.DTOs;

public record SavingsGoalDto(
    Guid Id,
    Guid UserId,
    string Name,
    decimal TargetAmount,
    decimal CurrentAmount,
    DateOnly? Deadline,
    string Description,
    bool IsCompleted,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    string Currency);

public record SavingsGoalCreateDto(
    string Name,
    decimal TargetAmount,
    DateOnly? Deadline,
    string Description,
    string Currency = "ARS");

public record SavingsGoalUpdateDto(
    string Name,
    decimal TargetAmount,
    decimal CurrentAmount,
    DateOnly? Deadline,
    string Description,
    bool IsCompleted,
    string Currency = "ARS");

public record AddFundsDto(decimal Amount);
