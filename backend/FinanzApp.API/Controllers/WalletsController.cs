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
[Route("api/wallets")]
public class WalletsController(AppDbContext db) : ControllerBase
{
    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static WalletDto ToDto(Wallet w) =>
        new(w.Id, w.UserId, w.Name, w.Type, w.Balance,
            w.Color, w.Description, w.CreatedAt);

    [HttpGet]
    public async Task<ActionResult<List<WalletDto>>> GetAll()
    {
        var userId = GetUserId();
        var result = await db.Wallets
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
        return Ok(result.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<WalletDto>> Create(WalletCreateDto dto)
    {
        var userId = GetUserId();

        var entity = new Wallet
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = dto.Name,
            Type = dto.Type,
            Balance = dto.Balance,
            Color = dto.Color,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow,
        };

        db.Wallets.Add(entity);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { }, ToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WalletDto>> Update(Guid id, WalletUpdateDto dto)
    {
        var userId = GetUserId();
        var entity = await db.Wallets.FirstOrDefaultAsync(w => w.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        entity.Name = dto.Name;
        entity.Type = dto.Type;
        entity.Balance = dto.Balance;
        entity.Color = dto.Color;
        entity.Description = dto.Description;

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var entity = await db.Wallets.FirstOrDefaultAsync(w => w.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        db.Wallets.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/adjust")]
    public async Task<ActionResult<WalletDto>> Adjust(Guid id, WalletAdjustDto dto)
    {
        var userId = GetUserId();
        var entity = await db.Wallets.FirstOrDefaultAsync(w => w.Id == id);

        if (entity is null) return NotFound();
        if (entity.UserId != userId) return Forbid();

        entity.Balance += dto.Delta;

        await db.SaveChangesAsync();
        return Ok(ToDto(entity));
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer(WalletTransferDto dto)
    {
        var userId = GetUserId();

        if (dto.Amount <= 0)
            return BadRequest(new { message = "El monto de la transferencia debe ser positivo." });

        if (dto.FromWalletId == dto.ToWalletId)
            return BadRequest(new { message = "Los wallets origen y destino deben ser distintos." });

        var from = await db.Wallets.FirstOrDefaultAsync(w => w.Id == dto.FromWalletId);
        var to = await db.Wallets.FirstOrDefaultAsync(w => w.Id == dto.ToWalletId);

        if (from is null || to is null) return NotFound(new { message = "Wallet no encontrado." });
        if (from.UserId != userId || to.UserId != userId) return Forbid();

        if (from.Balance < dto.Amount)
            return BadRequest(new { message = "Fondos insuficientes en el wallet origen." });

        from.Balance -= dto.Amount;
        to.Balance += dto.Amount;

        await db.SaveChangesAsync();

        return Ok(new
        {
            from = ToDto(from),
            to = ToDto(to),
        });
    }
}
