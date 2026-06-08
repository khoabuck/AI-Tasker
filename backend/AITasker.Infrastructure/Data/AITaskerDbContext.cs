using AITasker.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Data;

public class AITaskerDbContext : DbContext
{
    public AITaskerDbContext(DbContextOptions<AITaskerDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<EmailVerificationToken> EmailVerificationTokens
        => Set<EmailVerificationToken>();

    public DbSet<PasswordResetToken> PasswordResetTokens
        => Set<PasswordResetToken>();

    public DbSet<Wallet> Wallets => Set<Wallet>();
    
    public DbSet<Deliverable> Deliverables => Set<Deliverable>();
    
    public DbSet<Dispute> Disputes => Set<Dispute>();

    public DbSet<Transaction> Transactions => Set<Transaction>();
   
    public DbSet<AiRequestLog> AiRequestLogs => Set<AiRequestLog>();

    public DbSet<Notification> Notifications => Set<Notification>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");

            entity.HasKey(x => x.UserId);

            entity.Property(x => x.Email)
                .HasMaxLength(255)
                .IsRequired();

            entity.HasIndex(x => x.Email)
                .IsUnique();

            entity.Property(x => x.PasswordHash)
                .HasMaxLength(255);

            entity.Property(x => x.FullName)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(x => x.Role)
                .HasMaxLength(20);

            entity.Property(x => x.AuthProvider)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(x => x.GoogleId)
                .HasMaxLength(255);

            entity.HasIndex(x => x.GoogleId)
                .IsUnique()
                .HasFilter("[GoogleId] IS NOT NULL");

            entity.Property(x => x.AvatarUrl)
                .HasMaxLength(500);

            entity.Property(x => x.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);
        });

        modelBuilder.Entity<EmailVerificationToken>(entity =>
        {
            entity.ToTable("EmailVerificationTokens");

            entity.HasKey(x => x.EmailVerificationTokenId);

            entity.Property(x => x.TokenHash)
                .HasMaxLength(255)
                .IsRequired();

            entity.HasIndex(x => x.TokenHash)
                .IsUnique();

            entity.Property(x => x.ExpiresAt)
                .IsRequired();

            entity.Property(x => x.UsedAt);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("PasswordResetTokens");

            entity.HasKey(x => x.PasswordResetTokenId);

            entity.Property(x => x.TokenHash)
                .HasMaxLength(255)
                .IsRequired();

            entity.HasIndex(x => x.TokenHash)
                .IsUnique();

            entity.Property(x => x.ExpiresAt)
                .IsRequired();

            entity.Property(x => x.UsedAt);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Wallet>(entity =>
        {
            entity.ToTable("Wallets", "dbo");

            entity.HasKey(w => w.Id);
            entity.Property(w => w.Id).HasColumnName("WalletId");

            entity.Property(w => w.UserId).IsRequired();

            entity.Property(w => w.AvailableBalance).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            entity.Property(w => w.LockedBalance).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            entity.Property(w => w.TotalEarning).HasColumnType("decimal(18,2)").HasDefaultValue(0m); 

            entity.Property(w => w.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.ToTable("Transactions");

            entity.HasKey(x => x.TransactionId);

            entity.Property(x => x.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(x => x.Type)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(500);

            entity.Property(x => x.ReferenceId)
                .HasMaxLength(100);

            entity.Property(x => x.CreatedAt)
                .IsRequired();
                
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AiRequestLog>(entity =>
        {
            entity.ToTable("AiRequestLogs");

            entity.HasKey(x => x.Id);

            entity.Property(x => x.Feature)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.RequestBody)
                .IsRequired();

            entity.Property(x => x.ResponseBody)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();
        });

        modelBuilder.Entity<Deliverable>(entity =>
        {
            entity.ToTable("Deliverables", "dbo");
    
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Id).HasColumnName("DeliverableId");
    
            entity.Property(d => d.MilestoneId).IsRequired();
            entity.Property(d => d.ExpertId).IsRequired();
            entity.Property(d => d.VersionNumber).IsRequired().HasColumnName("VersionNumber");
            
            entity.Property(d => d.FileUrl).HasMaxLength(500);
            entity.Property(d => d.DemoUrl).HasMaxLength(500);
            entity.Property(d => d.TestResultUrl).HasMaxLength(500);
            entity.Property(d => d.Description).IsRequired();
    
            entity.Property(d => d.Status).HasMaxLength(30).HasDefaultValue("SUBMITTED");
            entity.Property(d => d.SubmittedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        });

        modelBuilder.Entity<Dispute>(entity =>
        {
            entity.ToTable("Disputes", "dbo");
    
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Id).HasColumnName("DisputeId");
    
            entity.Property(d => d.ProjectId).IsRequired();
            entity.Property(d => d.OpenedByUserId).IsRequired();
            entity.Property(d => d.RespondentUserId).IsRequired();
            entity.Property(d => d.Reason).IsRequired();
            entity.Property(d => d.DisputedAmount).HasColumnType("decimal(18,2)").IsRequired();
    
            entity.Property(d => d.Status).HasMaxLength(30).HasDefaultValue("OPEN");
            entity.Property(d => d.ResolutionType).HasMaxLength(30);
            entity.Property(d => d.OpenedAt).HasDefaultValueSql("SYSUTCDATETIME()"); 
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications", "dbo");
    
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Id).HasColumnName("NotificationId"); 
            
            entity.Property(n => n.UserId).IsRequired();
            entity.Property(n => n.Title).HasMaxLength(255).IsRequired();
            entity.Property(n => n.Content).IsRequired(); 
            entity.Property(n => n.Type).HasMaxLength(50).IsRequired().HasDefaultValue("SYSTEM");
    
            entity.Property(n => n.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        });
    }
}