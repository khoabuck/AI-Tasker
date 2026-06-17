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

    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();

    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    public DbSet<ClientProfile> ClientProfiles => Set<ClientProfile>();

    public DbSet<BusinessProfile> BusinessProfiles => Set<BusinessProfile>();

    public DbSet<ExpertProfile> ExpertProfiles => Set<ExpertProfile>();

    public DbSet<ExpertCertificate> ExpertCertificates => Set<ExpertCertificate>();

    public DbSet<Skill> Skills => Set<Skill>();

    public DbSet<ExpertSkill> ExpertSkills => Set<ExpertSkill>();

    public DbSet<JobPosting> JobPostings => Set<JobPosting>();

    public DbSet<JobSkill> JobSkills => Set<JobSkill>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // =========================
        // Users
        // =========================
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

        // =========================
        // EmailVerificationTokens
        // =========================
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

        // =========================
        // PasswordResetTokens
        // =========================
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

        // =========================
        // ClientProfiles
        // =========================
        modelBuilder.Entity<ClientProfile>(entity =>
        {
            entity.ToTable("ClientProfiles");

            entity.HasKey(x => x.ClientProfileId);

            entity.HasIndex(x => x.UserId)
                .IsUnique();

            entity.Property(x => x.ClientType)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(x => x.PhoneNumber)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.Address)
                .HasMaxLength(500);

            entity.Property(x => x.PlatformFeeRate)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // BusinessProfiles
        // =========================
        modelBuilder.Entity<BusinessProfile>(entity =>
        {
            entity.ToTable("BusinessProfiles");

            entity.HasKey(x => x.BusinessProfileId);

            entity.HasIndex(x => x.ClientProfileId)
                .IsUnique();

            entity.Property(x => x.CompanyName)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(x => x.TaxCode)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasIndex(x => x.TaxCode)
                .IsUnique();

            entity.Property(x => x.Industry)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.CompanyAddress)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.BusinessEmail)
                .HasMaxLength(255);

            entity.Property(x => x.BusinessPhone)
                .HasMaxLength(30);

            entity.Property(x => x.VerificationStatus)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.VerificationNote)
                .HasMaxLength(1000);

            entity.Property(x => x.VerificationSubmissionCount)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.VerificationLockedUntil);

            entity.Property(x => x.VerifiedAt);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);

            entity.HasOne(x => x.ClientProfile)
                .WithOne(x => x.BusinessProfile)
                .HasForeignKey<BusinessProfile>(x => x.ClientProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // ExpertProfiles
        // =========================
        modelBuilder.Entity<ExpertProfile>(entity =>
        {
            entity.ToTable("ExpertProfiles");

            entity.HasKey(x => x.ExpertProfileId);

            entity.HasIndex(x => x.UserId)
                .IsUnique();

            entity.Property(x => x.ProfessionalTitle)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(x => x.Bio)
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(x => x.Skills)
                .HasMaxLength(1000)
                .IsRequired();

            entity.Property(x => x.YearsOfExperience)
                .IsRequired();

            entity.Property(x => x.VerifiedYearsOfExperience)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.ExperienceConfidenceScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.ExperienceVerificationStatus)
                .HasMaxLength(30)
                .HasDefaultValue("UNVERIFIED")
                .IsRequired();

            entity.Property(x => x.ExperienceVerificationNote)
                .HasMaxLength(2000);

            entity.Property(x => x.ExpectedProjectBudgetMin)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(x => x.ExpectedProjectBudgetMax)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(x => x.PreferredProjectDurationDays)
                .IsRequired();

            entity.Property(x => x.AvailableForWork)
                .IsRequired();

            entity.Property(x => x.PortfolioUrl)
                .HasMaxLength(500);

            entity.Property(x => x.LinkedInUrl)
                .HasMaxLength(500);

            entity.Property(x => x.GitHubUrl)
                .HasMaxLength(500);

            entity.Property(x => x.ExpertCategory)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.ProfileScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.Level)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(x => x.ProfileReviewStatus)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.ProfileReviewNote)
                .HasMaxLength(2000);

            entity.Property(x => x.MissingInformation)
                .HasMaxLength(2000);

            entity.Property(x => x.VerifiedAt);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(x => x.Certificates)
                .WithOne(x => x.ExpertProfile)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(x => x.ExpertSkills)
                .WithOne(x => x.ExpertProfile)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // ExpertCertificates
        // =========================
        modelBuilder.Entity<ExpertCertificate>(entity =>
        {
            entity.ToTable("ExpertCertificates");

            entity.HasKey(x => x.ExpertCertificateId);

            entity.HasIndex(x => new
            {
                x.ExpertProfileId,
                x.CertificateUrl
            }).IsUnique();

            entity.Property(x => x.CertificateName)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(x => x.CertificateIssuer)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(x => x.CertificateUrl)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.IssuedAt);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.VerificationStatus)
                .HasMaxLength(30)
                .HasDefaultValue("UNVERIFIED")
                .IsRequired();

            entity.Property(x => x.VerificationScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.VerificationNote)
                .HasMaxLength(2000);

            entity.Property(x => x.DetectedIssuer)
                .HasMaxLength(255);

            entity.Property(x => x.DetectedCertificateName)
                .HasMaxLength(255);

            entity.Property(x => x.CheckedAt);

            entity.HasOne(x => x.ExpertProfile)
                .WithMany(x => x.Certificates)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // Skills
        // =========================
        modelBuilder.Entity<Skill>(entity =>
        {
            entity.ToTable("Skills");

            entity.HasKey(x => x.SkillId);

            entity.Property(x => x.SkillName)
                .HasMaxLength(100)
                .IsRequired();

            entity.HasIndex(x => x.SkillName)
                .IsUnique();

            entity.Property(x => x.Description)
                .HasMaxLength(500);

            entity.Property(x => x.Category)
                .HasMaxLength(100);

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();
        });

        // =========================
        // ExpertSkills
        // =========================
        modelBuilder.Entity<ExpertSkill>(entity =>
        {
            entity.ToTable("ExpertSkills");

            entity.HasKey(x => x.ExpertSkillId);

            entity.Property(x => x.SkillLevel)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.YearsOfExperience)
                .IsRequired();

            entity.Property(x => x.IsPrimary)
                .HasDefaultValue(false)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.HasOne(x => x.ExpertProfile)
                .WithMany(x => x.ExpertSkills)
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Skill)
                .WithMany()
                .HasForeignKey(x => x.SkillId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => new
            {
                x.ExpertProfileId,
                x.SkillId
            }).IsUnique();

            entity.HasIndex(x => x.SkillId);
        });

        // =========================
        // JobPostings
        // =========================
        modelBuilder.Entity<JobPosting>(entity =>
        {
            entity.ToTable("JobPostings");

            entity.HasKey(x => x.JobPostingId);

            entity.Property(x => x.Title)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(4000)
                .IsRequired();

            entity.Property(x => x.BudgetMin)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(x => x.BudgetMax)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(x => x.Deadline)
                .IsRequired();

            entity.Property(x => x.ProjectType)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.Complexity)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.ExpectedDeliverables)
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.IsAiAssisted)
                .HasDefaultValue(false)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);

            entity.HasOne(x => x.ClientProfile)
                .WithMany()
                .HasForeignKey(x => x.ClientProfileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(x => x.JobSkills)
                .WithOne(x => x.JobPosting)
                .HasForeignKey(x => x.JobPostingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new
            {
                x.ClientProfileId,
                x.Status
            });

            entity.HasIndex(x => new
            {
                x.Status,
                x.Deadline
            });
        });

        // =========================
        // JobSkills
        // =========================
        modelBuilder.Entity<JobSkill>(entity =>
        {
            entity.ToTable("JobSkills");

            entity.HasKey(x => x.JobSkillId);

            entity.Property(x => x.SkillLevelRequired)
                .HasMaxLength(30);

            entity.Property(x => x.IsRequired)
                .HasDefaultValue(true)
                .IsRequired();

            entity.HasOne(x => x.JobPosting)
                .WithMany(x => x.JobSkills)
                .HasForeignKey(x => x.JobPostingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Skill)
                .WithMany()
                .HasForeignKey(x => x.SkillId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => new
            {
                x.JobPostingId,
                x.SkillId
            }).IsUnique();

            entity.HasIndex(x => x.SkillId);
        });
    }
}