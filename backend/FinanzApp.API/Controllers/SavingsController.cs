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
[Route("api/savings")]
public class SavingsController(AppDbContext db) : ControllerBase
{
    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static SavingsGoalDto ToDto(SavingsGoal s) =>
        new(s.Id, s.UserId, s.Name, s.TargetAmount, s.CurrentAmount,
            s.Deadline, s.Description, s.IsCompleted, s.CompletedAt, s.CreatedAt);

    [HttpGet]
    public async Task<ActionResult<List<SavingsGoalDto>>> GetAll()
    {
        var userId = GetUserId();
        var result = await db.SavingsGoals
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
        return Ok(result.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<SavingsGoalDto>> Create(SavingsGoalCreateDto dto)
    {
        var userId = GetUserId();

        var entity = new SavingsGoal
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = dto.Name,
            TargetAmount = dto.TargetAmount,
            CurrentAmount = 0,
            Deadline = dto.Deadline,
            Description = dto.Description,
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow,
        };

        db.SavingsGoals.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { }, ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SavingsGoalDto>> Update(Guid id, SavingsGoalUpdateDto dto)
    {
        var userId = GetUserId();
        var entity = await db.SavingsGoals.FirstOrDefaultAsync(s => s.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        entity.Name = dto.Name;
        entity.TargetAmount = dto.TargetAmount;
        entity.CurrentAmount = dto.CurrentAmount;
        entity.Deadline = dto.Deadline;
        entity.Description = dto.Description;

        if (dto.IsCompleted && !entity.IsCompleted)
        {
            entity.IsCompleted = true;
            entity.CompletedAt = DateTime.UtcNow;
        }
        else if (!dto.IsCompleted)
        {
            entity.IsCompleted = false;
            entity.CompletedAt = null;
        }

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var entity = await db.SavingsGoals.FirstOrDefaultAsync(s => s.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        db.SavingsGoals.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/add-funds")]
    public async Task<ActionResult<SavingsGoalDto>> AddFunds(Guid id, AddFundsDto dto)
    {
        var userId = GetUserId();
        var entity = await db.SavingsGoals.FirstOrDefaultAsync(s => s.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        if (dto.Amount <= 0)
            return BadRequest(new { message = "El monto debe ser positivo." });

        entity.CurrentAmount += dto.Amount;

        if (entity.CurrentAmount >= entity.TargetAmount && !entity.IsCompleted)
        {
            entity.IsCompleted = true;
            entity.CompletedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }
}
