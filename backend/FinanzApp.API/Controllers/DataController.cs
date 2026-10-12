using System.Security.Claims;
using FinanzApp.API.Data;
using FinanzApp.API.DTOs;
using FinanzApp.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanzApp.API.Controllers;

/// <summary>Operaciones sobre todos los datos de la cuenta: resumen, exportar, importar y borrar.</summary>
[Authorize]
[ApiController]
[Route("api/data")]
public class DataController(AppDbContext db) : ControllerBase
{
    private const int MaxItemsPerCollection = 20_000;

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("summary")]
    public async Task<ActionResult<DataSummary>> Summary()
    {
        var userId = GetUserId();
        return Ok(new DataSummary(
            await db.Transactions.CountAsync(x => x.UserId == userId),
            await db.RecurringTransactions.CountAsync(x => x.UserId == userId),
            await db.Debts.CountAsync(x => x.UserId == userId),
            await db.SavingsGoals.CountAsync(x => x.UserId == userId),
            await db.FixedExpenses.CountAsync(x => x.UserId == userId),
            await db.Wallets.CountAsync(x => x.UserId == userId)));
    }

    [HttpGet("export")]
    public async Task<ActionResult<DataExport>> Export()
    {
        var userId = GetUserId();
        return Ok(new DataExport(
            DateTime.UtcNow,
            (await db.Transactions.Where(x => x.UserId == userId).OrderByDescending(x => x.Date).ToListAsync())
                .Select(TransactionsController.ToDto).ToList(),
            (await db.RecurringTransactions.Where(x => x.UserId == userId).ToListAsync())
                .Select(RecurringController.ToDto).ToList(),
            (await db.Debts.Where(x => x.UserId == userId).ToListAsync())
                .Select(DebtsController.ToDto).ToList(),
            (await db.SavingsGoals.Where(x => x.UserId == userId).ToListAsync())
                .Select(SavingsController.ToDto).ToList(),
            (await db.FixedExpenses.Where(x => x.UserId == userId).ToListAsync())
                .Select(FixedExpensesController.ToDto).ToList(),
            (await db.Wallets.Where(x => x.UserId == userId).ToListAsync())
                .Select(WalletsController.ToDto).ToList()));
    }

    /// <summary>
    /// Agrega los datos recibidos a la cuenta. Con <c>replace=true</c> primero borra los existentes
    /// (restaurar un backup). Todo corre en una transacción: o entra todo o no cambia nada.
    /// </summary>
    [HttpPost("import")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<DataSummary>> Import(DataImportRequest req, [FromQuery] bool replace = false)
    {
        var userId = GetUserId();
        var now = DateTime.UtcNow;

        var lists = new[]
        {
            req.Transactions?.Count, req.Recurring?.Count, req.Debts?.Count,
            req.Savings?.Count, req.FixedExpenses?.Count, req.Wallets?.Count,
        };
        if (lists.Any(c => c > MaxItemsPerCollection))
            return BadRequest(new { message = $"Máximo {MaxItemsPerCollection} elementos por tipo." });

        await using var tx = await db.Database.BeginTransactionAsync();
        if (replace) await DeleteUserData(userId);

        static DateTime Utc(DateTime? d, DateTime fallback) => d?.ToUniversalTime() ?? fallback;
        static string Cur(string? c) => Currencies.Normalize(c) ?? Currencies.ARS;

        foreach (var t in req.Transactions ?? [])
            db.Transactions.Add(new Transaction
            {
                Id = Guid.NewGuid(), UserId = userId,
                Type = t.Type, Amount = t.Amount, Category = t.Category,
                Description = t.Description ?? "", Date = t.Date, PaymentMethod = t.PaymentMethod,
                Currency = Cur(t.Currency),
                ExchangeRate = Cur(t.Currency) == Currencies.USD ? t.ExchangeRate : null,
                CreatedAt = Utc(t.CreatedAt, now),
            });

        foreach (var r in req.Recurring ?? [])
            db.RecurringTransactions.Add(new RecurringTransaction
            {
                Id = Guid.NewGuid(), UserId = userId,
                Type = r.Type, Amount = r.Amount, Category = r.Category,
                Description = r.Description ?? "", PaymentMethod = r.PaymentMethod, Pattern = r.Pattern,
                DaysOfWeek = r.DaysOfWeek ?? (r.DayOfWeek is int d ? [d] : null),
                DayOfMonth = r.DayOfMonth, StartDate = r.StartDate, EndDate = r.EndDate,
                IsActive = r.IsActive, CreatedAt = Utc(r.CreatedAt, now),
            });

        foreach (var d in req.Debts ?? [])
            db.Debts.Add(new Debt
            {
                Id = Guid.NewGuid(), UserId = userId,
                Direction = d.Direction, PersonName = d.PersonName,
                Amount = d.Amount, OriginalAmount = d.OriginalAmount ?? d.Amount,
                Description = d.Description ?? "", DueDate = d.DueDate,
                IsPaid = d.IsPaid, PaidAt = d.PaidAt?.ToUniversalTime(),
                Currency = Cur(d.Currency), CreatedAt = Utc(d.CreatedAt, now),
            });

        foreach (var s in req.Savings ?? [])
            db.SavingsGoals.Add(new SavingsGoal
            {
                Id = Guid.NewGuid(), UserId = userId,
                Name = s.Name, TargetAmount = s.TargetAmount, CurrentAmount = s.CurrentAmount,
                Deadline = s.Deadline, Description = s.Description ?? "",
                IsCompleted = s.IsCompleted, CompletedAt = s.CompletedAt?.ToUniversalTime(),
                Currency = Cur(s.Currency), CreatedAt = Utc(s.CreatedAt, now),
            });

        foreach (var f in req.FixedExpenses ?? [])
            db.FixedExpenses.Add(new FixedExpense
            {
                Id = Guid.NewGuid(), UserId = userId,
                Name = f.Name, Amount = f.Amount, Category = f.Category, DayOfMonth = f.DayOfMonth,
                Description = f.Description ?? "", IsActive = f.IsActive, CreatedAt = Utc(f.CreatedAt, now),
            });

        foreach (var w in req.Wallets ?? [])
            db.Wallets.Add(new Wallet
            {
                Id = Guid.NewGuid(), UserId = userId,
                Name = w.Name, Type = w.Type, Balance = w.Balance, Color = w.Color,
                Description = w.Description ?? "", Currency = Cur(w.Currency), CreatedAt = Utc(w.CreatedAt, now),
            });

        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return await Summary();
    }

    /// <summary>Borra todos los datos financieros de la cuenta (no la cuenta ni sus credenciales).</summary>
    [HttpDelete]
    public async Task<IActionResult> DeleteAll()
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        await DeleteUserData(GetUserId());
        await tx.CommitAsync();
        return NoContent();
    }

    private async Task DeleteUserData(Guid userId)
    {
        await db.Transactions.Where(x => x.UserId == userId).ExecuteDeleteAsync();
        await db.RecurringTransactions.Where(x => x.UserId == userId).ExecuteDeleteAsync();
        await db.Debts.Where(x => x.UserId == userId).ExecuteDeleteAsync();
        await db.SavingsGoals.Where(x => x.UserId == userId).ExecuteDeleteAsync();
        await db.FixedExpenses.Where(x => x.UserId == userId).ExecuteDeleteAsync();
        await db.Wallets.Where(x => x.UserId == userId).ExecuteDeleteAsync();
    }
}
