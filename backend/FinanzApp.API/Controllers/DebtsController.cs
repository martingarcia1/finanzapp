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
[Route("api/debts")]
public class DebtsController(AppDbContext db) : ControllerBase
{
    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static DebtDto ToDto(Debt d) =>
        new(d.Id, d.UserId, d.Direction, d.PersonName, d.Amount,
            d.OriginalAmount, d.Description, d.DueDate,
            d.IsPaid, d.PaidAt, d.CreatedAt);

    [HttpGet]
    public async Task<ActionResult<List<DebtDto>>> GetAll()
    {
        var userId = GetUserId();
        var result = await db.Debts
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();
        return Ok(result.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<DebtDto>> Create(DebtCreateDto dto)
    {
        var userId = GetUserId();

        var entity = new Debt
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Direction = dto.Direction,
            PersonName = dto.PersonName,
            Amount = dto.Amount,
            OriginalAmount = dto.Amount,
            Description = dto.Description,
            DueDate = dto.DueDate,
            IsPaid = false,
            CreatedAt = DateTime.UtcNow,
        };

        db.Debts.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { }, ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DebtDto>> Update(Guid id, DebtUpdateDto dto)
    {
        var userId = GetUserId();
        var entity = await db.Debts.FirstOrDefaultAsync(d => d.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        entity.Direction = dto.Direction;
        entity.PersonName = dto.PersonName;
        entity.Amount = dto.Amount;
        entity.OriginalAmount = dto.OriginalAmount;
        entity.Description = dto.Description;
        entity.DueDate = dto.DueDate;
        entity.IsPaid = dto.IsPaid;

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var entity = await db.Debts.FirstOrDefaultAsync(d => d.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        db.Debts.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/payment")]
    public async Task<ActionResult<DebtDto>> RegisterPayment(Guid id, DebtPaymentDto dto)
    {
        var userId = GetUserId();
        var entity = await db.Debts.FirstOrDefaultAsync(d => d.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();
        if (entity.IsPaid) return BadRequest(new { message = "La deuda ya está pagada." });

        if (dto.Amount <= 0)
            return BadRequest(new { message = "El monto del pago debe ser positivo." });

        entity.Amount = Math.Max(0, entity.Amount - dto.Amount);

        if (entity.Amount == 0)
        {
            entity.IsPaid = true;
            entity.PaidAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpPost("{id:guid}/mark-paid")]
    public async Task<ActionResult<DebtDto>> MarkPaid(Guid id)
    {
        var userId = GetUserId();
        var entity = await db.Debts.FirstOrDefaultAsync(d => d.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        entity.Amount = 0;
        entity.IsPaid = true;
        entity.PaidAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }
}
