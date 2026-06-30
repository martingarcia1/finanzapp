using System.Security.Claims;
using System.Text.Json;
using Fido2NetLib;
using Fido2NetLib.Objects;
using FinanzApp.API.Data;
using FinanzApp.API.DTOs;
using FinanzApp.API.Models;
using FinanzApp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace FinanzApp.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    JwtService jwtService,
    IFido2 fido2,
    IMemoryCache cache) : ControllerBase
{
    // ── Register ──────────────────────────────────────────────────────────────
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return Conflict(new { message = "El email ya está registrado." });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = req.Email,
            UserName = req.UserName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            CreatedAt = DateTime.UtcNow,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = jwtService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.UserName, user.Email));
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user is null || user.PasswordHash is null ||
            !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Credenciales inválidas." });

        var token = jwtService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Id, user.UserName, user.Email));
    }

    // ── WebAuthn: Register Options ────────────────────────────────────────────
    [Authorize]
    [HttpPost("webauthn/register/options")]
    public async Task<IActionResult> WebAuthnRegisterOptions()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        var existingCredentials = await db.FidoCredentials
            .Where(c => c.UserId == userId)
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId))
            .ToListAsync();

        var fidoUser = new Fido2User
        {
            Id = userId.ToByteArray(),
            Name = user.Email,
            DisplayName = user.UserName,
        };

        var options = fido2.RequestNewCredential(new RequestNewCredentialParams
        {
            User = fidoUser,
            ExcludeCredentials = existingCredentials,
            AuthenticatorSelection = AuthenticatorSelection.Default,
            AttestationPreference = AttestationConveyancePreference.None,
        });

        cache.Set($"webauthn_reg_{userId}", options.ToJson(),
            TimeSpan.FromMinutes(5));

        return Ok(options);
    }

    // ── WebAuthn: Register Complete ───────────────────────────────────────────
    [Authorize]
    [HttpPost("webauthn/register/complete")]
    public async Task<IActionResult> WebAuthnRegisterComplete(
        WebAuthnRegisterCompleteRequest req)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (!cache.TryGetValue<string>($"webauthn_reg_{userId}", out var optionsJson) ||
            optionsJson is null)
            return BadRequest(new { message = "Sesión de registro expirada." });

        var options = CredentialCreateOptions.FromJson(optionsJson);
        cache.Remove($"webauthn_reg_{userId}");

        var attestationResponse = JsonSerializer.Deserialize<AuthenticatorAttestationRawResponse>(
            req.AttestationRawResponse.GetRawText())!;

        var registeredCred = await fido2.MakeNewCredentialAsync(
            new MakeNewCredentialParams
            {
                AttestationResponse = attestationResponse,
                OriginalOptions = options,
                IsCredentialIdUniqueToUserCallback = async (args, ct) =>
                    !await db.FidoCredentials.AnyAsync(
                        c => c.CredentialId == args.CredentialId, ct),
            });

        var credential = new FidoCredential
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CredentialId = registeredCred.Id,
            PublicKey = registeredCred.PublicKey,
            AaGuid = Guid.Empty, // AaGuid not exposed on RegisteredPublicKeyCredential in v4
            SignCount = registeredCred.SignCount,
            Transports = registeredCred.Transports is not null
                ? JsonSerializer.Serialize(registeredCred.Transports)
                : null,
            DeviceName = req.AttestationRawResponse.TryGetProperty("deviceName", out var dn)
                ? dn.GetString()
                : null,
            CreatedAt = DateTime.UtcNow,
        };

        db.FidoCredentials.Add(credential);
        await db.SaveChangesAsync();

        return Ok(new
        {
            message = "Credencial registrada correctamente.",
            credentialId = credential.Id,
        });
    }

    // ── WebAuthn: Login Options ───────────────────────────────────────────────
    [HttpPost("webauthn/login/options")]
    public async Task<IActionResult> WebAuthnLoginOptions(WebAuthnLoginOptionsRequest req)
    {
        var user = await db.Users
            .Include(u => u.Credentials)
            .FirstOrDefaultAsync(u => u.Email == req.Email);

        if (user is null)
            return NotFound(new { message = "Usuario no encontrado." });

        var allowedCredentials = user.Credentials
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId))
            .ToList();

        var options = fido2.GetAssertionOptions(new GetAssertionOptionsParams
        {
            AllowedCredentials = allowedCredentials,
            UserVerification = UserVerificationRequirement.Preferred,
        });

        cache.Set($"webauthn_auth_{req.Email}", options.ToJson(),
            TimeSpan.FromMinutes(5));

        return Ok(options);
    }

    // ── WebAuthn: Login Complete ──────────────────────────────────────────────
    [HttpPost("webauthn/login/complete")]
    public async Task<ActionResult<AuthResponse>> WebAuthnLoginComplete(
        WebAuthnLoginCompleteRequest req)
    {
        var assertionResponse = JsonSerializer.Deserialize<AuthenticatorAssertionRawResponse>(
            req.AssertionRawResponse.GetRawText())!;

        // Locate credential in DB by raw CredentialId (RawId is byte[])
        var rawId = assertionResponse.RawId;
        var storedCredential = await db.FidoCredentials
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.CredentialId == rawId);

        if (storedCredential is null)
            return Unauthorized(new { message = "Credencial no encontrada." });

        var email = storedCredential.User.Email;

        if (!cache.TryGetValue<string>($"webauthn_auth_{email}", out var optionsJson) ||
            optionsJson is null)
            return BadRequest(new { message = "Sesión de autenticación expirada." });

        var options = AssertionOptions.FromJson(optionsJson);
        cache.Remove($"webauthn_auth_{email}");

        var expectedUserId = storedCredential.UserId.ToByteArray();

        var result = await fido2.MakeAssertionAsync(new MakeAssertionParams
        {
            AssertionResponse = assertionResponse,
            OriginalOptions = options,
            StoredPublicKey = storedCredential.PublicKey,
            StoredSignatureCounter = storedCredential.SignCount,
            IsUserHandleOwnerOfCredentialIdCallback = async (args, ct) =>
            {
                var cred = await db.FidoCredentials
                    .FirstOrDefaultAsync(c => c.CredentialId == args.CredentialId, ct);
                if (cred is null) return false;
                return cred.UserId.ToByteArray().SequenceEqual(args.UserHandle);
            },
        });

        storedCredential.SignCount = result.SignCount;
        storedCredential.LastUsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var token = jwtService.GenerateToken(storedCredential.User);
        return Ok(new AuthResponse(
            token,
            storedCredential.User.Id,
            storedCredential.User.UserName,
            storedCredential.User.Email));
    }

    // ── List Credentials ──────────────────────────────────────────────────────
    [Authorize]
    [HttpGet("credentials")]
    public async Task<ActionResult<List<CredentialDto>>> GetCredentials()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var credentials = await db.FidoCredentials
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CredentialDto(c.Id, c.DeviceName, c.CreatedAt, c.LastUsedAt))
            .ToListAsync();

        return Ok(credentials);
    }

    // ── Delete Credential ─────────────────────────────────────────────────────
    [Authorize]
    [HttpDelete("credentials/{id:guid}")]
    public async Task<IActionResult> DeleteCredential(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var credential = await db.FidoCredentials
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);

        if (credential is null) return NotFound();

        db.FidoCredentials.Remove(credential);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
