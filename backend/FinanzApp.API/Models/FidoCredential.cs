namespace FinanzApp.API.Models;

public class FidoCredential
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public byte[] CredentialId { get; set; } = Array.Empty<byte>();
    public byte[] PublicKey { get; set; } = Array.Empty<byte>();
    public Guid AaGuid { get; set; }
    public uint SignCount { get; set; }
    public string? Transports { get; set; }
    public string? DeviceName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }

    public User User { get; set; } = null!;
}
