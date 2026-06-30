namespace FinanzApp.API.Models;

public class Debt
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Direction { get; set; } = string.Empty;
    public string PersonName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal OriginalAmount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateOnly? DueDate { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
