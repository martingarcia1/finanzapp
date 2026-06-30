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
[Route("api/recurring")]
public class RecurringController(AppDbContext db) : ControllerBase
{
    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static RecurringTransactionDto ToDto(RecurringTransaction r) =>
        new(r.Id, r.UserId, r.Type, r.Amount, r.Category, r.Description,
            r.PaymentMethod, r.Pattern, r.DaysOfWeek, r.DayOfMonth,
            r.StartDate, r.EndDate, r.IsActive, r.CreatedAt);

    [HttpGet]
    public async Task<ActionResult<List<RecurringTransactionDto>>> GetAll()
    {
        var userId = GetUserId();
        var result = await db.RecurringTransactions
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        return Ok(result.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<RecurringTransactionDto>> Create(
        RecurringTransactionCreateDto dto)
    {
        var userId = GetUserId();

        var entity = new RecurringTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = dto.Type,
            Amount = dto.Amount,
            Category = dto.Category,
            Description = dto.Description,
            PaymentMethod = dto.PaymentMethod,
            Pattern = dto.Pattern,
            DaysOfWeek = dto.DaysOfWeek,
            DayOfMonth = dto.DayOfMonth,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        db.RecurringTransactions.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { }, ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<RecurringTransactionDto>> Update(
        Guid id, RecurringTransactionUpdateDto dto)
    {
        var userId = GetUserId();
        var entity = await db.RecurringTransactions.FirstOrDefaultAsync(r => r.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        entity.Type = dto.Type;
        entity.Amount = dto.Amount;
        entity.Category = dto.Category;
        entity.Description = dto.Description;
        entity.PaymentMethod = dto.PaymentMethod;
        entity.Pattern = dto.Pattern;
        entity.DaysOfWeek = dto.DaysOfWeek;
        entity.DayOfMonth = dto.DayOfMonth;
        entity.StartDate = dto.StartDate;
        entity.EndDate = dto.EndDate;
        entity.IsActive = dto.IsActive;

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var entity = await db.RecurringTransactions.FirstOrDefaultAsync(r => r.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        db.RecurringTransactions.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/toggle-active")]
    public async Task<ActionResult<RecurringTransactionDto>> ToggleActive(Guid id)
    {
        var userId = GetUserId();
        var entity = await db.RecurringTransactions.FirstOrDefaultAsync(r => r.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        entity.IsActive = !entity.IsActive;
        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }
}
