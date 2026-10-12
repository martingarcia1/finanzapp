namespace FinanzApp.API.DTOs;

// Formato de importación: coincide con el JSON que exporta la app (y con lo que había
// en localStorage), así sirve tanto para restaurar un backup como para migrar datos locales.
// Los ids de origen se ignoran: el servidor genera ids nuevos.

public record ImportTransaction(
    string Type,
    decimal Amount,
    string Category,
    string? Description,
    DateOnly Date,
    string PaymentMethod,
    string? Currency,
    decimal? ExchangeRate,
    DateTime? CreatedAt);

public record ImportRecurring(
    string Type,
    decimal Amount,
    string Category,
    string? Description,
    string PaymentMethod,
    string Pattern,
    int? DayOfWeek,          // formato viejo: un solo día
    int[]? DaysOfWeek,
    int? DayOfMonth,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsActive,
    DateTime? CreatedAt);

public record ImportDebt(
    string Direction,
    string PersonName,
    decimal Amount,
    decimal? OriginalAmount,
    string? Description,
    DateOnly? DueDate,
    bool IsPaid,
    DateTime? PaidAt,
    string? Currency,
    DateTime? CreatedAt);

public record ImportSavingsGoal(
    string Name,
    decimal TargetAmount,
    decimal CurrentAmount,
    DateOnly? Deadline,
    string? Description,
    bool IsCompleted,
    DateTime? CompletedAt,
    string? Currency,
    DateTime? CreatedAt);

public record ImportFixedExpense(
    string Name,
    decimal Amount,
    string Category,
    int DayOfMonth,
    string? Description,
    bool IsActive,
    DateTime? CreatedAt);

public record ImportWallet(
    string Name,
    string Type,
    decimal Balance,
    string Color,
    string? Description,
    string? Currency,
    DateTime? CreatedAt);

public record DataImportRequest(
    List<ImportTransaction>? Transactions,
    List<ImportRecurring>? Recurring,
    List<ImportDebt>? Debts,
    List<ImportSavingsGoal>? Savings,
    List<ImportFixedExpense>? FixedExpenses,
    List<ImportWallet>? Wallets);

public record DataSummary(
    int Transactions,
    int Recurring,
    int Debts,
    int Savings,
    int FixedExpenses,
    int Wallets);

public record DataExport(
    DateTime ExportedAt,
    List<TransactionDto> Transactions,
    List<RecurringTransactionDto> Recurring,
    List<DebtDto> Debts,
    List<SavingsGoalDto> Savings,
    List<FixedExpenseDto> FixedExpenses,
    List<WalletDto> Wallets);
