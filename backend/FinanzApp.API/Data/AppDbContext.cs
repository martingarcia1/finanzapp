using FinanzApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace FinanzApp.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<FidoCredential> FidoCredentials => Set<FidoCredential>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<RecurringTransaction> RecurringTransactions => Set<RecurringTransaction>();
    public DbSet<Debt> Debts => Set<Debt>();
    public DbSet<SavingsGoal> SavingsGoals => Set<SavingsGoal>();
    public DbSet<FixedExpense> FixedExpenses => Set<FixedExpense>();
    public DbSet<Wallet> Wallets => Set<Wallet>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).ValueGeneratedOnAdd();
            e.Property(u => u.Email).IsRequired().HasMaxLength(256);
            e.Property(u => u.UserName).IsRequired().HasMaxLength(100);
            e.HasIndex(u => u.Email).IsUnique();
        });

        // ── FidoCredential ────────────────────────────────────────────────────
        modelBuilder.Entity<FidoCredential>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).ValueGeneratedOnAdd();
            e.Property(c => c.CredentialId).IsRequired();
            e.Property(c => c.PublicKey).IsRequired();
            e.Property(c => c.Transports).HasColumnType("jsonb");
            e.HasIndex(c => c.CredentialId).IsUnique();
            e.HasOne(c => c.User)
             .WithMany(u => u.Credentials)
             .HasForeignKey(c => c.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Transaction ───────────────────────────────────────────────────────
        modelBuilder.Entity<Transaction>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Id).ValueGeneratedOnAdd();
            e.Property(t => t.Amount).HasColumnType("numeric(18,2)");
            e.HasOne(t => t.User)
             .WithMany()
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── RecurringTransaction ──────────────────────────────────────────────
        modelBuilder.Entity<RecurringTransaction>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).ValueGeneratedOnAdd();
            e.Property(r => r.Amount).HasColumnType("numeric(18,2)");
            e.Property(r => r.DaysOfWeek).HasColumnType("jsonb");
            e.HasOne(r => r.User)
             .WithMany()
             .HasForeignKey(r => r.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Debt ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<Debt>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.Id).ValueGeneratedOnAdd();
            e.Property(d => d.Amount).HasColumnType("numeric(18,2)");
            e.Property(d => d.OriginalAmount).HasColumnType("numeric(18,2)");
            e.HasOne(d => d.User)
             .WithMany()
             .HasForeignKey(d => d.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── SavingsGoal ───────────────────────────────────────────────────────
        modelBuilder.Entity<SavingsGoal>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).ValueGeneratedOnAdd();
            e.Property(s => s.TargetAmount).HasColumnType("numeric(18,2)");
            e.Property(s => s.CurrentAmount).HasColumnType("numeric(18,2)");
            e.HasOne(s => s.User)
             .WithMany()
             .HasForeignKey(s => s.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── FixedExpense ──────────────────────────────────────────────────────
        modelBuilder.Entity<FixedExpense>(e =>
        {
            e.HasKey(f => f.Id);
            e.Property(f => f.Id).ValueGeneratedOnAdd();
            e.Property(f => f.Amount).HasColumnType("numeric(18,2)");
            e.HasOne(f => f.User)
             .WithMany()
             .HasForeignKey(f => f.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Wallet ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Wallet>(e =>
        {
            e.HasKey(w => w.Id);
            e.Property(w => w.Id).ValueGeneratedOnAdd();
            e.Property(w => w.Balance).HasColumnType("numeric(18,2)");
            e.HasOne(w => w.User)
             .WithMany()
             .HasForeignKey(w => w.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
