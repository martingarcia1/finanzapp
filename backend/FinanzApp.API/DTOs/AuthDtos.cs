using System.Text.Json;

namespace FinanzApp.API.DTOs;

public record RegisterRequest(string Email, string Password, string UserName);

public record LoginRequest(string Email, string Password);

public record AuthResponse(string Token, Guid UserId, string UserName, string Email);

public record WebAuthnRegisterCompleteRequest(JsonElement AttestationRawResponse);

public record WebAuthnLoginOptionsRequest(string Email);

public record WebAuthnLoginCompleteRequest(JsonElement AssertionRawResponse);

public record CredentialDto(Guid Id, string? DeviceName, DateTime CreatedAt, DateTime? LastUsedAt);
