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
[Route("api/fixed-expenses")]
public class FixedExpensesController(AppDbContext db) : ControllerBase
{
    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static FixedExpenseDto ToDto(FixedExpense f) =>
        new(f.Id, f.UserId, f.Name, f.Amount, f.Category,
            f.DayOfMonth, f.Description, f.IsActive, f.CreatedAt);

    [HttpGet]
    public async Task<ActionResult<List<FixedExpenseDto>>> GetAll()
    {
        var userId = GetUserId();
        var result = await db.FixedExpenses
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();
        return Ok(result.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<FixedExpenseDto>> Create(FixedExpenseCreateDto dto)
    {
        var userId = GetUserId();

        var entity = new FixedExpense
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = dto.Name,
            Amount = dto.Amount,
            Category = dto.Category,
            DayOfMonth = dto.DayOfMonth,
            Description = dto.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        db.FixedExpenses.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { }, ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FixedExpenseDto>> Update(Guid id, FixedExpenseUpdateDto dto)
    {
        var userId = GetUserId();
        var entity = await db.FixedExpenses.FirstOrDefaultAsync(f => f.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        entity.Name = dto.Name;
        entity.Amount = dto.Amount;
        entity.Category = dto.Category;
        entity.DayOfMonth = dto.DayOfMonth;
        entity.Description = dto.Description;
        entity.IsActive = dto.IsActive;

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var entity = await db.FixedExpenses.FirstOrDefaultAsync(f => f.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        db.FixedExpenses.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
