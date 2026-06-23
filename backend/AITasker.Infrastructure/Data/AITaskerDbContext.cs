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

    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    public DbSet<PlatformFeePolicy> PlatformFeePolicies => Set<PlatformFeePolicy>();

    public DbSet<ExpertProfileScoringPolicy> ExpertProfileScoringPolicies => Set<ExpertProfileScoringPolicy>();

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

    public DbSet<Proposal> Proposals { get; set; }

    public DbSet<ProposalVersion> ProposalVersions { get; set; }

    public DbSet<ProposalMilestoneDraft> ProposalMilestoneDrafts { get; set; }

    public DbSet<Conversation> Conversations { get; set; }

    public DbSet<ConversationMessage> ConversationMessages { get; set; }

    public DbSet<ProjectContract> ProjectContracts { get; set; }

    public DbSet<ContractMilestoneDraft> ContractMilestoneDrafts { get; set; }

    public DbSet<Project> Projects { get; set; }

    public DbSet<Milestone> Milestones { get; set; }

    public DbSet<Wallet> Wallets { get; set; }

    public DbSet<DepositOrder> DepositOrders { get; set; }

    public DbSet<Transaction> Transactions { get; set; }

    public DbSet<Escrow> Escrows { get; set; }

    public DbSet<WithdrawalRequest> WithdrawalRequests { get; set; }

    public DbSet<Deliverable> Deliverables { get; set; }

    public DbSet<Dispute> Disputes { get; set; }

    public DbSet<DisputeEvidence> DisputeEvidences { get; set; }

    public DbSet<Review> Reviews { get; set; }

    public DbSet<Notification> Notifications { get; set; }

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

            entity.HasIndex(x => x.Role);

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

            entity.HasIndex(x => x.Status);

            entity.Property(x => x.StatusBeforeSuspension)
                .HasMaxLength(30);

            // Admin user lock / ban management
            entity.Property(x => x.LockoutCount)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.LockoutEnd);

            entity.Property(x => x.LastLockedAt);

            entity.Property(x => x.LockReason)
                .HasMaxLength(500);

            entity.Property(x => x.BannedAt);

            entity.Property(x => x.BanReason)
                .HasMaxLength(500);

            entity.HasIndex(x => x.LockoutEnd);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);
        });



        // =========================
        // AdminAuditLogs
        // =========================
        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.ToTable("AdminAuditLogs");

            entity.HasKey(x => x.AdminAuditLogId);

            entity.Property(x => x.Action)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.EntityName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.OldValue)
                .HasMaxLength(4000);

            entity.Property(x => x.NewValue)
                .HasMaxLength(4000);

            entity.Property(x => x.Reason)
                .HasMaxLength(500);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.HasOne(x => x.Admin)
                .WithMany()
                .HasForeignKey(x => x.AdminId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.AdminId);

            entity.HasIndex(x => x.Action);

            entity.HasIndex(x => x.EntityName);

            entity.HasIndex(x => x.EntityId);

            entity.HasIndex(x => x.CreatedAt);
        });

        // =========================
        // PlatformFeePolicies
        // =========================
        modelBuilder.Entity<PlatformFeePolicy>(entity =>
        {
            entity.ToTable("PlatformFeePolicies");

            entity.HasKey(x => x.PlatformFeePolicyId);

            entity.Property(x => x.IndividualClientFeeRate)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.BusinessClientFeeRate)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);

            entity.HasOne(x => x.UpdatedByAdmin)
                .WithMany()
                .HasForeignKey(x => x.UpdatedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.IsActive);

            entity.HasIndex(x => x.UpdatedByAdminId);
        });


        // =========================
        // ExpertProfileScoringPolicies
        // =========================
        modelBuilder.Entity<ExpertProfileScoringPolicy>(entity =>
        {
            entity.ToTable("ExpertProfileScoringPolicies");

            entity.HasKey(x => x.ExpertProfileScoringPolicyId);

            entity.Property(x => x.PassThreshold)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.MaxReviewSubmissions)
                .IsRequired();

            entity.Property(x => x.ReviewLockDurationHours)
                .IsRequired();

            entity.Property(x => x.ProfileCompletenessMaxScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.AiSkillMaxScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.ExperienceMaxScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.PortfolioMaxScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.GitHubMaxScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.LinkedInMaxScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.CertificateMaxScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.RiskMaxPenalty)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.CertificateUnverifiedMaxProfileScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(x => x.BioMinimumLength)
                .IsRequired();

            entity.Property(x => x.SkillsMinimumLength)
                .IsRequired();

            entity.Property(x => x.MaxCertificates)
                .IsRequired();

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);

            entity.HasOne(x => x.UpdatedByAdmin)
                .WithMany()
                .HasForeignKey(x => x.UpdatedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.IsActive);

            entity.HasIndex(x => x.UpdatedByAdminId);
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
                .HasDefaultValue("NEEDS_EVIDENCE")
                .IsRequired();

            entity.Property(x => x.ExperienceVerificationNote)
                .HasMaxLength(2000);

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

            entity.Property(x => x.ProfileReviewSubmissionCount)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.ProfileReviewLockedUntil);

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
                .HasDefaultValue("NEEDS_EVIDENCE")
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

        // =========================
        // Proposal
        // =========================
        modelBuilder.Entity<Proposal>(entity =>
        {
            entity.ToTable("Proposals", t =>
            {
                t.HasCheckConstraint(
                    "CK_Proposals_Status",
                    "[Status] IN ('SUBMITTED','ACCEPTED','REJECTED','WITHDRAWN','NOT_SELECTED')");

                t.HasCheckConstraint(
                    "CK_Proposals_Price_Timeline",
                    "[ProposedPrice] > 0 AND [ProposedTimelineDays] > 0");
            });

            entity.HasKey(e => e.ProposalId);

            entity.Property(e => e.CoverLetter)
                .IsRequired();

            entity.Property(e => e.ExpectedOutputs)
                .IsRequired();

            entity.Property(e => e.WorkingApproach)
                .IsRequired();

            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.ProposedPrice)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.JobId);

            entity.HasIndex(e => e.ExpertId);

            entity.HasIndex(e => e.Status);

            entity.HasIndex(e => new { e.JobId, e.ExpertId })
                .IsUnique()
                .HasFilter("[Status] <> 'WITHDRAWN'");

            entity.HasIndex(e => e.JobId)
                .IsUnique()
                .HasFilter("[Status] = 'ACCEPTED'");

            entity.HasOne(e => e.JobPosting)
                .WithMany()
                .HasForeignKey(e => e.JobId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ExpertProfile)
                .WithMany()
                .HasForeignKey(e => e.ExpertId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.ProposalVersions)
                .WithOne(e => e.Proposal)
                .HasForeignKey(e => e.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // ProposalMilestoneDraft
        // =========================
        modelBuilder.Entity<ProposalMilestoneDraft>(entity =>
        {
            entity.ToTable("ProposalMilestoneDrafts", table =>
            {
                table.HasCheckConstraint(
                    "CK_ProposalMilestoneDrafts_Amount",
                    "[Amount] > 0");

                table.HasCheckConstraint(
                    "CK_ProposalMilestoneDrafts_OrderIndex",
                    "[OrderIndex] > 0");

                table.HasCheckConstraint(
                    "CK_ProposalMilestoneDrafts_DeadlineOffsetDays",
                    "[DeadlineOffsetDays] > 0");

                table.HasCheckConstraint(
                    "CK_ProposalMilestoneDrafts_RevisionLimit",
                    "[RevisionLimit] >= 0");
            });

            entity.HasKey(e => e.ProposalMilestoneDraftId);

            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(e => e.Description)
                .IsRequired();

            entity.Property(e => e.ExpectedDeliverable)
                .IsRequired();

            entity.Property(e => e.AcceptanceCriteria)
                .IsRequired();

            entity.Property(e => e.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.OrderIndex)
                .IsRequired();

            entity.Property(e => e.DeadlineOffsetDays)
                .IsRequired();

            entity.Property(e => e.RevisionLimit)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.ProposalId);

            entity.HasIndex(e => new
            {
                e.ProposalId,
                e.OrderIndex
            }).IsUnique();

            entity.HasOne(e => e.Proposal)
                .WithMany(e => e.MilestoneDrafts)
                .HasForeignKey(e => e.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // ProposalVersion
        // =========================
        modelBuilder.Entity<ProposalVersion>(entity =>
        {
            entity.ToTable("ProposalVersions", table =>
            {
                table.HasCheckConstraint(
                    "CK_ProposalVersions_Price_Timeline",
                    "[ProposedPrice] > 0 AND [ProposedTimelineDays] > 0");

                table.HasCheckConstraint(
                    "CK_ProposalVersions_VersionNumber",
                    "[VersionNumber] > 0");
            });

            entity.HasKey(e => e.ProposalVersionId);

            entity.Property(e => e.CoverLetter)
                .IsRequired();

            entity.Property(e => e.ExpectedOutputs)
                .IsRequired();

            entity.Property(e => e.WorkingApproach)
                .IsRequired();

            entity.Property(e => e.ResubmitNote)
                .HasMaxLength(1000);

            entity.Property(e => e.MilestonePlanJson);

            entity.Property(e => e.ProposedPrice)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.ProposedTimelineDays)
                .IsRequired();

            entity.Property(e => e.VersionNumber)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.ProposalId);

            entity.HasIndex(e => e.CreatedByUserId);

            entity.HasIndex(e => new
            {
                e.ProposalId,
                e.VersionNumber
            }).IsUnique();

            entity.HasOne(e => e.Proposal)
                .WithMany(e => e.ProposalVersions)
                .HasForeignKey(e => e.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // Conversation
        // =========================
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.ToTable("Conversations", table =>
            {
                table.HasCheckConstraint(
                    "CK_Conversations_Type",
                    "[ConversationType] IN ('DIRECT_CONTACT','JOB_INQUIRY','PROPOSAL_NEGOTIATION','CONTRACT_NEGOTIATION','PROJECT_DISCUSSION','MILESTONE_DISCUSSION','DISPUTE_DISCUSSION','SUPPORT')");

                table.HasCheckConstraint(
                    "CK_Conversations_Status",
                    "[Status] IN ('ACTIVE','ARCHIVED','CLOSED')");
            });

            entity.HasKey(e => e.ConversationId);

            entity.Property(e => e.ConversationType)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.Property(e => e.LastMessageAt);

            entity.HasIndex(e => e.ConversationType);

            entity.HasIndex(e => e.Status);

            entity.HasIndex(e => e.CreatedByUserId);

            entity.HasIndex(e => e.ClientUserId);

            entity.HasIndex(e => e.ExpertUserId);

            entity.HasIndex(e => e.RelatedJobId);

            entity.HasIndex(e => e.RelatedProposalId);

            entity.HasIndex(e => e.RelatedContractId);

            entity.HasIndex(e => e.RelatedProjectId);

            entity.HasIndex(e => e.RelatedMilestoneId);

            entity.HasIndex(e => e.RelatedDisputeId);

            entity.HasIndex(e => new
            {
                e.ConversationType,
                e.ClientUserId,
                e.ExpertUserId,
                e.RelatedJobId,
                e.RelatedProposalId,
                e.RelatedContractId,
                e.RelatedProjectId,
                e.RelatedMilestoneId,
                e.RelatedDisputeId,
                e.Status
            });

            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ClientUser)
                .WithMany()
                .HasForeignKey(e => e.ClientUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ExpertUser)
                .WithMany()
                .HasForeignKey(e => e.ExpertUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RelatedJob)
                .WithMany()
                .HasForeignKey(e => e.RelatedJobId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RelatedProposal)
                .WithMany()
                .HasForeignKey(e => e.RelatedProposalId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RelatedContract)
                .WithMany()
                .HasForeignKey(e => e.RelatedContractId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RelatedProject)
                .WithMany()
                .HasForeignKey(e => e.RelatedProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RelatedMilestone)
                .WithMany()
                .HasForeignKey(e => e.RelatedMilestoneId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.RelatedDispute)
                .WithMany()
                .HasForeignKey(e => e.RelatedDisputeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Messages)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // ConversationMessage
        // =========================
        modelBuilder.Entity<ConversationMessage>(entity =>
        {
            entity.ToTable("ConversationMessages", table =>
            {
                table.HasCheckConstraint(
                    "CK_ConversationMessages_MessageType",
                    "[MessageType] IN ('TEXT','SYSTEM','FILE','PROPOSAL_VERSION','CONTRACT_DRAFT','MILESTONE_DRAFT','DELIVERABLE','DISPUTE_EVIDENCE')");
            });

            entity.HasKey(e => e.ConversationMessageId);

            entity.Property(e => e.Content)
                .HasMaxLength(4000)
                .IsRequired();

            entity.Property(e => e.MessageType)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.AttachmentUrl)
                .HasMaxLength(1000);

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.ConversationId);

            entity.HasIndex(e => e.SenderUserId);

            entity.HasIndex(e => new
            {
                e.ConversationId,
                e.CreatedAt
            });

            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.SenderUser)
                .WithMany()
                .HasForeignKey(e => e.SenderUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // ProjectContract
        // =========================
        modelBuilder.Entity<ProjectContract>(entity =>
        {
            entity.ToTable("ProjectContracts", t =>
            {
                t.HasCheckConstraint(
                "CK_ProjectContracts_Status",
                "[Status] IN ('DRAFT','CONFIRMED','CANCELLED')");

                t.HasCheckConstraint(
                "CK_ProjectContracts_Source",
                "[ContractSource] IN ('PROPOSAL','CHAT_AGREEMENT')");

                t.HasCheckConstraint(
                "CK_ProjectContracts_Amounts",
                "[FinalPrice] > 0 AND [PlatformFeeRate] >= 0 AND [PlatformFeeAmount] >= 0 AND [TotalClientPayment] = [FinalPrice] + [PlatformFeeAmount] AND [FinalTimelineDays] > 0 AND [RevisionLimit] >= 0");
            });

            entity.HasKey(e => e.ContractId);

            entity.HasIndex(e => e.ProposalId)
                .IsUnique();

            entity.HasIndex(e => new
            {
                e.ProposalId,
                e.SourceProposalVersionNumber
            });

            entity.Property(e => e.SourceProposalVersionNumber)
                .HasDefaultValue(1)
                .IsRequired();

            entity.Property(e => e.ProjectScope)
                .IsRequired();

            entity.Property(e => e.FinalPrice)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.PlatformFeeRate)
                .HasColumnType("decimal(5,2)")
                .IsRequired();

            entity.Property(e => e.PlatformFeeAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.TotalClientPayment)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.Deliverables)
                .IsRequired();

            entity.Property(e => e.AcceptanceCriteria)
                .IsRequired();

            entity.Property(e => e.PaymentTerms)
                .IsRequired();

            entity.Property(e => e.ContractSource)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.ClientId);

            entity.HasIndex(e => e.ExpertId);

            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Proposal)
                .WithOne(p => p.ProjectContract)
                .HasForeignKey<ProjectContract>(e => e.ProposalId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ClientProfile)
                .WithMany()
                .HasForeignKey(e => e.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ExpertProfile)
                .WithMany()
                .HasForeignKey(e => e.ExpertId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // ContractMilestoneDraft
        // =========================
        modelBuilder.Entity<ContractMilestoneDraft>(entity =>
        {
            entity.ToTable("ContractMilestoneDrafts", table =>
            {
                table.HasCheckConstraint(
                    "CK_ContractMilestoneDrafts_Amount",
                    "[Amount] > 0");

                table.HasCheckConstraint(
                    "CK_ContractMilestoneDrafts_OrderIndex",
                    "[OrderIndex] > 0");

                table.HasCheckConstraint(
                    "CK_ContractMilestoneDrafts_DeadlineOffsetDays",
                    "[DeadlineOffsetDays] > 0");

                table.HasCheckConstraint(
                    "CK_ContractMilestoneDrafts_RevisionLimit",
                    "[RevisionLimit] >= 0");
            });

            entity.HasKey(e => e.ContractMilestoneDraftId);

            entity.Property(e => e.Title)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(e => e.Description)
                .IsRequired();

            entity.Property(e => e.ExpectedDeliverable)
                .IsRequired();

            entity.Property(e => e.AcceptanceCriteria)
                .IsRequired();

            entity.Property(e => e.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.OrderIndex)
                .IsRequired();

            entity.Property(e => e.DeadlineOffsetDays)
                .IsRequired();

            entity.Property(e => e.RevisionLimit)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.ContractId);

            entity.HasIndex(e => new
            {
                e.ContractId,
                e.OrderIndex
            }).IsUnique();

            entity.HasOne(e => e.Contract)
                .WithMany(e => e.MilestoneDrafts)
                .HasForeignKey(e => e.ContractId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // Project
        // =========================
        modelBuilder.Entity<Project>(entity =>
        {
            entity.ToTable("Projects", t =>
            {
                t.HasCheckConstraint(
                "CK_Projects_Status",
                "[Status] IN ('PENDING_ESCROW','ACTIVE','DISPUTED','COMPLETED','CANCELLED')");

                t.HasCheckConstraint(
                "CK_Projects_TotalBudget",
                "[TotalBudget] >= 0");
            });

            entity.HasKey(e => e.ProjectId);

            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.Description)
                .IsRequired();

            entity.Property(e => e.TotalBudget)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.ContractId)
                .IsUnique();

            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Contract)
                .WithOne(c => c.Project)
                .HasForeignKey<Project>(e => e.ContractId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Milestones)
                .WithOne(m => m.Project)
                .HasForeignKey(m => m.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // Milestone
        // =========================
        modelBuilder.Entity<Milestone>(entity =>
        {
            entity.ToTable("Milestones", t =>
            {
                t.HasCheckConstraint(
                "CK_Milestones_Amount",
                "[Amount] >= 0");

                t.HasCheckConstraint(
                "CK_Milestones_OrderIndex",
                "[OrderIndex] > 0");

                t.HasCheckConstraint(
                "CK_Milestones_Revision",
                "[RevisionLimit] >= 0 AND [RevisionUsed] >= 0 AND [RevisionUsed] <= [RevisionLimit]");

                t.HasCheckConstraint(
                "CK_Milestones_Status",
                "[Status] IN ('PENDING','FUNDED','IN_PROGRESS','OVERDUE','SUBMITTED','REVISION_REQUESTED','APPROVED','DISPUTED','RESOLVED','DISPUTE_RESOLVED','RELEASED','REFUNDED')");

                t.HasCheckConstraint(
                "CK_Milestones_PaymentStatus",
                "[PaymentStatus] IN ('PENDING','LOCKED','FROZEN','RELEASED','REFUNDED')");
            });

            entity.HasKey(e => e.MilestoneId);

            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.Description)
                .IsRequired();

            entity.Property(e => e.ExpectedDeliverable)
                .IsRequired();

            entity.Property(e => e.AcceptanceCriteria)
                .IsRequired();

            entity.Property(e => e.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.SubmissionOverdueNotifiedAt);

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.ProjectId);

            entity.HasIndex(e => new
            {
                e.ProjectId,
                e.OrderIndex
            }).IsUnique();

            entity.HasIndex(e => e.Status);

            entity.HasIndex(e => e.Deadline);

            entity.HasIndex(e => new
            {
                e.Status,
                e.Deadline,
                e.SubmissionOverdueNotifiedAt
            });

            entity.HasIndex(e => e.PaymentStatus);
        });

        // =========================
        // Wallet
        // =========================
        modelBuilder.Entity<Wallet>(entity =>
        {
            entity.ToTable("Wallets", t =>
            {
                t.HasCheckConstraint(
                "CK_Wallets_Balances",
                "[AvailableBalance] >= 0 AND [LockedBalance] >= 0 AND [TotalEarning] >= 0 AND [AvailableBalance] + [LockedBalance] >= 0");
            });

            entity.HasKey(w => w.WalletId);

            entity.Property(w => w.AvailableBalance)
                .HasColumnType("decimal(18,2)");

            entity.Property(w => w.LockedBalance)
                .HasColumnType("decimal(18,2)");

            entity.Property(w => w.TotalEarning)
                .HasColumnType("decimal(18,2)");

            entity.HasOne(w => w.User)
                .WithOne()
                .HasForeignKey<Wallet>(w => w.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // DepositOrder
        // =========================
        modelBuilder.Entity<DepositOrder>(entity =>
        {
            entity.ToTable("DepositOrders", table =>
            {
                table.HasCheckConstraint(
                    "CK_DepositOrders_Amount",
                    "[Amount] > 0");

                table.HasCheckConstraint(
                    "CK_DepositOrders_Status",
                    "[Status] IN ('PENDING','PAID','EXPIRED','CANCELLED')");
            });

            entity.HasKey(e => e.DepositOrderId);

            entity.Property(e => e.OrderCode)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.Provider)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(e => e.PaymentContent)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(e => e.QrContent)
                .IsRequired()
                .HasMaxLength(1000);

            entity.Property(e => e.Status)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(e => e.ProviderReference)
                .HasMaxLength(255);

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.Property(e => e.ExpiresAt)
                .IsRequired();

            entity.HasIndex(e => e.UserId);

            entity.HasIndex(e => e.OrderCode)
                .IsUnique();

            entity.HasIndex(e => e.Status);

            entity.HasIndex(e => new
            {
                e.UserId,
                e.Status,
                e.CreatedAt
            });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property(e => e.PayOsOrderCode);

            entity.Property(e => e.CheckoutUrl)
                .HasMaxLength(1000);

            entity.Property(e => e.PaymentLinkId)
                .HasMaxLength(255);

            entity.Property(e => e.ReturnUrl)
                .HasMaxLength(1000);

            entity.Property(e => e.CancelUrl)
                .HasMaxLength(1000);

            entity.HasIndex(e => e.PayOsOrderCode)
                .IsUnique()
                .HasFilter("[PayOsOrderCode] IS NOT NULL");

            entity.HasIndex(e => e.PaymentLinkId)
                .HasFilter("[PaymentLinkId] IS NOT NULL");
        });

        // =========================
        // Transaction
        // =========================
        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.ToTable("Transactions", t =>
            {
                t.HasCheckConstraint(
                "CK_Transactions_Status",
                "[Status] IN ('PENDING','SUCCESS','FAILED','CANCELLED')");
            });

            entity.HasKey(t => t.TransactionId);

            entity.Property(t => t.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(t => t.Type)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(t => t.Status)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(t => t.Description)
                .HasMaxLength(1000)
                .IsRequired();

            entity.Property(t => t.ReferenceId)
                .HasMaxLength(100);

            entity.Property(t => t.CreatedAt)
                .IsRequired();

            entity.HasIndex(t => t.UserId);

            entity.HasIndex(t => t.ProjectId);

            entity.HasIndex(t => t.MilestoneId);

            entity.HasIndex(t => t.EscrowId);

            entity.HasIndex(t => new
            {
                t.Type,
                t.Status,
                t.CreatedAt
            });

            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<Project>()
                .WithMany()
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<Escrow>()
                .WithMany()
                .HasForeignKey(t => t.EscrowId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<Milestone>()
                .WithMany()
                .HasForeignKey(t => t.MilestoneId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // Escrow
        // =========================
        modelBuilder.Entity<Escrow>(entity =>
        {
            entity.ToTable("Escrows", t =>
            {
                t.HasCheckConstraint(
                "CK_Escrows_Amount",
                "[Amount] >= 0");

                t.HasCheckConstraint(
                "CK_Escrows_Status",
                "[Status] IN ('PENDING','LOCKED','FROZEN','RELEASED','REFUNDED','RESOLVED')");
            });

            entity.HasKey(e => e.EscrowId);

            entity.Property(e => e.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.Property(e => e.UpdatedAt);

            entity.HasIndex(e => e.ProjectId);

            entity.HasIndex(e => e.ClientProfileId);

            entity.HasIndex(e => e.Status);

            entity.HasIndex(e => e.MilestoneId)
                .IsUnique()
                .HasFilter("[MilestoneId] IS NOT NULL");

            entity.HasOne(e => e.Project)
                .WithMany()
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Milestone)
                .WithOne()
                .HasForeignKey<Escrow>(e => e.MilestoneId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ClientProfile)
                .WithMany()
                .HasForeignKey(e => e.ClientProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // Deliverable
        // =========================
        modelBuilder.Entity<Deliverable>(entity =>
        {
            entity.ToTable("Deliverables", t =>
            {
                t.HasCheckConstraint(
                "CK_Deliverables_VersionNumber",
                "[VersionNumber] > 0");

                t.HasCheckConstraint(
                "CK_Deliverables_Status",
                "[Status] IN ('SUBMITTED','APPROVED','AUTO_APPROVED','REVISION_REQUESTED')");
            });

            entity.HasKey(d => d.DeliverableId);

            entity.Property(d => d.Description)
                .HasMaxLength(4000)
                .IsRequired();

            entity.Property(d => d.Status)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(d => d.FileUrl)
                .HasMaxLength(500);

            entity.Property(d => d.DemoUrl)
                .HasMaxLength(500);

            entity.Property(d => d.TestResultUrl)
                .HasMaxLength(500);

            entity.Property(d => d.HandoverNotes)
                .HasMaxLength(4000);

            entity.Property(d => d.ClientFeedback)
                .HasMaxLength(4000);

            entity.Property(d => d.SubmittedAt)
                .IsRequired();

            entity.Property(d => d.ReviewDeadlineAt);
            
            entity.Property(d => d.ReviewedAt);
            
            entity.Property(d => d.OverdueNotifiedAt);

            entity.HasIndex(d => d.MilestoneId);

            entity.HasIndex(d => d.ExpertId);

            entity.HasIndex(d => d.Status);

            entity.HasIndex(d => d.ReviewDeadlineAt);

            entity.HasIndex(d => new
            {
                d.Status,
                d.ReviewDeadlineAt,
                d.ReviewedAt
            });

            entity.HasIndex(d => new
            {
                d.MilestoneId,
                d.VersionNumber
            }).IsUnique();

            entity.HasOne(d => d.Expert)
                .WithMany()
                .HasForeignKey(d => d.ExpertId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<Milestone>()
                .WithMany()
                .HasForeignKey(d => d.MilestoneId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // Dispute
        // =========================
        modelBuilder.Entity<Dispute>(entity =>
        {
            entity.ToTable("Disputes", t =>
            {
                t.HasCheckConstraint(
                "CK_Disputes_Amount",
                "[DisputedAmount] > 0");

                t.HasCheckConstraint(
                "CK_Disputes_Status",
                "[Status] IN ('OPEN','RESOLVED','CANCELLED')");

                t.HasCheckConstraint(
                "CK_Disputes_ResolutionType",
                "[ResolutionType] IS NULL OR [ResolutionType] IN ('RELEASE_TO_EXPERT','REFUND_TO_CLIENT')");
            });

            entity.HasKey(d => d.DisputeId);

            entity.Property(d => d.Reason)
                .HasMaxLength(4000)
                .IsRequired();

            entity.Property(d => d.DisputedAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(d => d.Status)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(d => d.ResolutionType)
                .HasMaxLength(50);

            entity.Property(d => d.AdminDecision)
                .HasMaxLength(4000);

            entity.Property(d => d.CreatedAt)
                .IsRequired();

            entity.HasIndex(d => new
            {
                d.ProjectId,
                d.Status
            });

            entity.HasIndex(d => new
            {
                d.MilestoneId,
                d.Status
            });

            entity.HasIndex(d => d.OpenedByUserId);

            entity.HasIndex(d => d.RespondentUserId);

            entity.HasIndex(d => new
            {
                d.MilestoneId,
                d.Status
            })
            .IsUnique()
            .HasFilter("[MilestoneId] IS NOT NULL AND [Status] = 'OPEN'");

            entity.HasIndex(d => new
            {
                d.ProjectId,
                d.Status,
                d.MilestoneId
            })
            .IsUnique()
            .HasFilter("[MilestoneId] IS NULL AND [Status] = 'OPEN'");

            entity.HasOne(d => d.Project)
                .WithMany()
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Milestone)
                .WithMany()
                .HasForeignKey(d => d.MilestoneId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.OpenedByUser)
                .WithMany()
                .HasForeignKey(d => d.OpenedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.RespondentUser)
                .WithMany()
                .HasForeignKey(d => d.RespondentUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(d => d.Evidences)
                .WithOne(e => e.Dispute)
                .HasForeignKey(e => e.DisputeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // DisputeEvidence
        // =========================
        modelBuilder.Entity<DisputeEvidence>(entity =>
        {
            entity.ToTable("DisputeEvidences");

            entity.HasKey(e => e.EvidenceId);

            entity.Property(e => e.EvidenceText)
                .HasMaxLength(4000)
                .IsRequired();

            entity.Property(e => e.FileUrl)
                .HasMaxLength(500);

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.DisputeId);

            entity.HasIndex(e => e.UploadedByUserId);

            entity.HasOne(e => e.Dispute)
                .WithMany(d => d.Evidences)
                .HasForeignKey(e => e.DisputeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.UploadedByUser)
                .WithMany()
                .HasForeignKey(e => e.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // Review
        // =========================
        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("Reviews", t =>
            {
                
                t.HasCheckConstraint(
                "CK_Reviews_Rating",
                "[Rating] BETWEEN 1 AND 5");
            });

            entity.HasKey(r => r.ReviewId);

            entity.Property(r => r.Rating)
                .IsRequired();

            entity.Property(r => r.Comment)
                .HasMaxLength(1000);

            entity.Property(r => r.CreatedAt)
                .IsRequired();

            entity.HasIndex(r => r.ProjectId)
                .IsUnique();

            entity.HasIndex(r => r.ExpertId);

            entity.HasIndex(r => r.ClientId);

            entity.HasOne(r => r.Project)
                .WithMany()
                .HasForeignKey(r => r.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.Client)
                .WithMany()
                .HasForeignKey(r => r.ClientId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.Expert)
                .WithMany()
                .HasForeignKey(r => r.ExpertId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // Notification
        // =========================
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications");

            entity.HasKey(n => n.NotificationId);

            entity.Property(n => n.Title)
                .HasMaxLength(255);

            entity.Property(n => n.Type)
                .HasMaxLength(50);

            entity.HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // WithdrawalRequest
        // =========================
        modelBuilder.Entity<WithdrawalRequest>(entity =>
        {
            entity.ToTable("WithdrawalRequests");

            entity.HasKey(w => w.WithdrawalRequestId);

            entity.Property(w => w.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(w => w.FeeAmount)
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(w => w.NetAmount)
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(w => w.BankCode)
                .HasMaxLength(30)
                .HasDefaultValue(string.Empty)
                .IsRequired();

            entity.Property(w => w.BankName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(w => w.BankAccountNumber)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(w => w.BankAccountHolder)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(w => w.BankVerificationStatus)
                .HasMaxLength(30)
                .HasDefaultValue("NOT_VERIFIED")
                .IsRequired();

            entity.Property(w => w.BankVerificationMessage)
                .HasMaxLength(500);

            entity.Property(w => w.PayoutReferenceCode)
                .HasMaxLength(100);

            entity.Property(w => w.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(w => w.AdminNote)
                .HasMaxLength(1000);

            entity.Property(w => w.CreatedAt)
                .IsRequired();

            entity.HasIndex(w => w.UserId);

            entity.HasIndex(w => w.Status);

            entity.HasIndex(w => w.BankVerificationStatus);

            entity.HasIndex(w => w.PayoutReferenceCode);

            entity.HasIndex(w => w.CreatedAt);

            entity.HasOne(w => w.User)
                .WithMany()
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(w => w.ProcessedByAdmin)
                .WithMany()
                .HasForeignKey(w => w.ProcessedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
