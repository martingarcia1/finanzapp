using System.Security.Claims;
using FinanzApp.API.Data;
using FinanzApp.API.DTOs;
using FinanzApp.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinanzApp.API.Controllers;

[Authorize]
[ApiController]
[Route("api/transactions")]
public class TransactionsController(AppDbContext db) : ControllerBase
{
    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<TransactionDto>>> GetAll(
        [FromQuery] int? year,
        [FromQuery] int? month)
    {
        var userId = GetUserId();

        var query = db.Transactions.Where(t => t.UserId == userId);

        if (year.HasValue)
            query = query.Where(t => t.Date.Year == year.Value);

        if (month.HasValue)
            query = query.Where(t => t.Date.Month == month.Value);

        var result = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => new TransactionDto(
                t.Id, t.UserId, t.Type, t.Amount,
                t.Category, t.Description, t.Date,
                t.PaymentMethod, t.CreatedAt))
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create(TransactionCreateDto dto)
    {
        var userId = GetUserId();

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = dto.Type,
            Amount = dto.Amount,
            Category = dto.Category,
            Description = dto.Description,
            Date = dto.Date,
            PaymentMethod = dto.PaymentMethod,
            CreatedAt = DateTime.UtcNow,
        };

        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { },
            new TransactionDto(
                transaction.Id, transaction.UserId, transaction.Type,
                transaction.Amount, transaction.Category, transaction.Description,
                transaction.Date, transaction.PaymentMethod, transaction.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> Update(Guid id, TransactionUpdateDto dto)
    {
        var userId = GetUserId();

        var transaction = await db.Transactions
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transaction is null) return NotFound();
        if (transaction.UserId != userId) return Forbid();

        transaction.Type = dto.Type;
        transaction.Amount = dto.Amount;
        transaction.Category = dto.Category;
        transaction.Description = dto.Description;
        transaction.Date = dto.Date;
        transaction.PaymentMethod = dto.PaymentMethod;

        await db.SaveChangesAsync();

        return Ok(new TransactionDto(
            transaction.Id, transaction.UserId, transaction.Type,
            transaction.Amount, transaction.Category, transaction.Description,
            transaction.Date, transaction.PaymentMethod, transaction.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();

        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id);

        if (transaction is null) return NotFound();
        if (transaction.UserId != userId) return Forbid();

        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
