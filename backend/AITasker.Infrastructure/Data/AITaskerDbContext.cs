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

    public DbSet<JobPostingAiPolicy> JobPostingAiPolicies => Set<JobPostingAiPolicy>();

    public DbSet<AiSettings> AiSettings => Set<AiSettings>();

    public DbSet<AiAllowedModel> AiAllowedModels => Set<AiAllowedModel>();

    public DbSet<AiUsageLog> AiUsageLogs => Set<AiUsageLog>();

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

    public DbSet<ProposalCreditPackage> ProposalCreditPackages => Set<ProposalCreditPackage>();

    public DbSet<ProposalCreditPackagePurchase> ProposalCreditPackagePurchases => Set<ProposalCreditPackagePurchase>();

    public DbSet<Conversation> Conversations { get; set; }

    public DbSet<ConversationMessage> ConversationMessages { get; set; }

    public DbSet<ProjectContract> ProjectContracts { get; set; }

    public DbSet<ContractMilestoneDraft> ContractMilestoneDrafts { get; set; }

    public DbSet<Project> Projects { get; set; }

    public DbSet<Milestone> Milestones { get; set; }

    public DbSet<Wallet> Wallets { get; set; }

    public DbSet<PlatformWallet> PlatformWallets { get; set; }

    public DbSet<PlatformTransaction> PlatformTransactions { get; set; }

    public DbSet<DepositOrder> DepositOrders { get; set; }

    public DbSet<Transaction> Transactions { get; set; }

    public DbSet<Escrow> Escrows { get; set; }

    public DbSet<WithdrawalRequest> WithdrawalRequests { get; set; }

    public DbSet<Deliverable> Deliverables { get; set; }

    public DbSet<DeliverableArtifact> DeliverableArtifacts { get; set; }

    public DbSet<Dispute> Disputes { get; set; }

    public DbSet<DisputeEvidence> DisputeEvidences { get; set; }

    public DbSet<Review> Reviews { get; set; }

    public DbSet<ReviewReport> ReviewReports { get; set; }

    public DbSet<Notification> Notifications { get; set; }

    public DbSet<JobCreditPackage> JobCreditPackages => Set<JobCreditPackage>();

    public DbSet<JobCreditPackagePurchase> JobCreditPackagePurchases => Set<JobCreditPackagePurchase>();

    public DbSet<MarketplaceWorkflowPolicy> MarketplaceWorkflowPolicies => Set<MarketplaceWorkflowPolicy>();

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

            entity.Property(x => x.ExpertFeeRate)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(15.00m)
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
        // MarketplaceWorkflowPolicies
        // =========================
        modelBuilder.Entity<MarketplaceWorkflowPolicy>(entity =>
        {
            entity.ToTable("MarketplaceWorkflowPolicies");

            entity.HasKey(x => x.MarketplaceWorkflowPolicyId);

            entity.Property(x => x.ContractSignWindowHours)
                .IsRequired();

            entity.Property(x => x.MinimumWithdrawalAmount)
                .HasColumnType("decimal(18,2)");

            entity.Property(x => x.WithdrawalFeeRate)
                .HasColumnType("decimal(18,4)")
                .HasDefaultValue(0m);

            entity.Property(x => x.MinimumDepositAmount)
                .HasColumnType("decimal(18,2)");

            entity.Property(x => x.MaximumDepositAmount)
                .HasColumnType("decimal(18,2)");

            entity.Property(x => x.DepositOrderExpireMinutes)
                .HasDefaultValue(3)
                .IsRequired();

            entity.Property(x => x.WithdrawalApprovalWindowHours)
                .HasDefaultValue(2)
                .IsRequired();

            entity.Property(x => x.WithdrawalPayoutSyncWarningHours)
                .HasDefaultValue(24)
                .IsRequired();

            entity.Property(x => x.UpdateReason)
                .HasMaxLength(500);

            entity.HasOne(x => x.UpdatedByAdmin)
                .WithMany()
                .HasForeignKey(x => x.UpdatedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.UpdatedByAdminId);

            entity.HasIndex(x => x.IsActive);
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
        // AI Management
        // =========================
        modelBuilder.Entity<AiSettings>(entity =>
        {
            entity.ToTable("AiSettings");

            entity.HasKey(x => x.AiSettingsId);

            entity.Property(x => x.Provider)
                .HasMaxLength(50)
                .HasDefaultValue("Groq")
                .IsRequired();

            entity.Property(x => x.Model)
                .HasMaxLength(100)
                .HasDefaultValue("openai/gpt-oss-120b")
                .IsRequired();

            entity.Property(x => x.IsEnabled)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(x => x.JobAssistantMaxTokens)
                .HasDefaultValue(3000)
                .IsRequired();

            entity.Property(x => x.ExpertSkillMaxTokens)
                .HasDefaultValue(1500)
                .IsRequired();

            entity.Property(x => x.ProfileReviewMaxTokens)
                .HasDefaultValue(2000)
                .IsRequired();

            entity.Property(x => x.SkillValidatorMaxTokens)
                .HasDefaultValue(1200)
                .IsRequired();

            entity.Property(x => x.Temperature)
                .HasDefaultValue(0.1)
                .IsRequired();

            entity.Property(x => x.JsonObjectResponse)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(x => x.MonthlyTokenLimit)
                .HasDefaultValue(1000000)
                .IsRequired();

            entity.Property(x => x.MonthlyRequestLimit)
                .HasDefaultValue(50000)
                .IsRequired();

            entity.Property(x => x.DailyRequestLimitPerUser)
                .HasDefaultValue(50)
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

            entity.HasIndex(x => x.Provider);
            entity.HasIndex(x => x.IsActive);
            entity.HasIndex(x => x.UpdatedByAdminId);
        });



        modelBuilder.Entity<AiAllowedModel>(entity =>
        {
            entity.ToTable("AiAllowedModels");

            entity.HasKey(x => x.AiAllowedModelId);

            entity.Property(x => x.Provider)
                .HasMaxLength(50)
                .HasDefaultValue("Groq")
                .IsRequired();

            entity.Property(x => x.Model)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.DisplayName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(x => x.IsEnabled)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(x => x.SupportsJsonObjectResponse)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(x => x.MaxOutputTokens)
                .HasDefaultValue(4096)
                .IsRequired();

            entity.Property(x => x.Notes)
                .HasMaxLength(1000);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);

            entity.HasOne(x => x.UpdatedByAdmin)
                .WithMany()
                .HasForeignKey(x => x.UpdatedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => new { x.Provider, x.Model })
                .IsUnique();

            entity.HasIndex(x => x.IsEnabled);
            entity.HasIndex(x => x.UpdatedByAdminId);
        });

        modelBuilder.Entity<AiUsageLog>(entity =>
        {
            entity.ToTable("AIUsageLogs");

            entity.HasKey(x => x.AiUsageLogId);

            entity.Property(x => x.Feature)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.EntityType)
                .HasMaxLength(100);

            entity.Property(x => x.Provider)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.Model)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.ErrorCode)
                .HasMaxLength(100);

            entity.Property(x => x.ErrorMessage)
                .HasMaxLength(1000);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.Feature);
            entity.HasIndex(x => x.Provider);
            entity.HasIndex(x => x.Model);
            entity.HasIndex(x => x.CreatedAt);
        });

        // =========================
        // JobPostingAiPolicies
        // =========================
        modelBuilder.Entity<JobPostingAiPolicy>(entity =>
        {
            entity.ToTable("JobPostingAiPolicies", table =>
            {
                table.HasCheckConstraint(
                    "CK_JobPostingAiPolicies_Credits",
                    "[InitialFreeJobPostCredits] >= 0 AND [InitialFreeAiGenerationCredits] >= 0"
                );

                table.HasCheckConstraint(
                    "CK_JobPostingAiPolicies_Limits",
                    "[MaxDraftJobsPerClient] BETWEEN 1 AND 100 AND [MaxSkillsPerJob] BETWEEN 1 AND 30 AND [MaxSuggestedSkills] BETWEEN 1 AND 30 AND [MaxSuggestedSkills] <= [MaxSkillsPerJob]"
                );

                table.HasCheckConstraint(
                    "CK_JobPostingAiPolicies_Scores",
                    "[MinimumSkillRelevanceScore] BETWEEN 0 AND 100 AND [MinimumRecommendationMatchScore] BETWEEN 0 AND 100"
                );

                table.HasCheckConstraint(
                    "CK_JobPostingAiPolicies_RecommendationResults",
                    "[MaxRecommendationResults] BETWEEN 1 AND 100"
                );
            });

            entity.HasKey(x => x.JobPostingAiPolicyId);

            entity.Property(x => x.InitialFreeJobPostCredits)
                .HasDefaultValue(1)
                .IsRequired();

            entity.Property(x => x.InitialFreeAiGenerationCredits)
                .HasDefaultValue(3)
                .IsRequired();

            entity.Property(x => x.MaxDraftJobsPerClient)
                .HasDefaultValue(10)
                .IsRequired();

            entity.Property(x => x.MaxSkillsPerJob)
                .HasDefaultValue(8)
                .IsRequired();

            entity.Property(x => x.MaxSuggestedSkills)
                .HasDefaultValue(8)
                .IsRequired();

            entity.Property(x => x.MinimumSkillRelevanceScore)
                .HasDefaultValue(60)
                .IsRequired();

            entity.Property(x => x.MaxRecommendationResults)
                .HasDefaultValue(50)
                .IsRequired();

            entity.Property(x => x.MinimumRecommendationMatchScore)
                .HasDefaultValue(1)
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

            entity.HasIndex(x => x.PhoneNumber)
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

            entity.Property(x => x.FreeJobPostCredits)
                .HasDefaultValue(1)
                .IsRequired();

            entity.Property(x => x.PaidJobPostCredits)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.FreeAiGenerationCredits)
                .HasDefaultValue(3)
                .IsRequired();

            entity.Property(x => x.PaidAiGenerationCredits)
                .HasDefaultValue(0)
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
        // JobCreditPackages
        // =========================
        modelBuilder.Entity<JobCreditPackage>(entity =>
        {
            entity.ToTable("JobCreditPackages", table =>
            {
                table.HasCheckConstraint(
                    "CK_JobCreditPackages_CreditsAndPrice",
                    "[JobPostCredits] > 0 AND [AiGenerationCredits] >= 0 AND [Price] >= 0"
                );
            });

            entity.HasKey(x => x.JobCreditPackageId);

            entity.Property(x => x.PackageName)
                .HasMaxLength(100)
                .IsRequired();

            entity.HasIndex(x => x.PackageName)
                .IsUnique();

            entity.Property(x => x.Description)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.JobPostCredits)
                .IsRequired();

            entity.Property(x => x.AiGenerationCredits)
                .IsRequired();

            entity.Property(x => x.Price)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(x => x.Currency)
                .HasMaxLength(10)
                .HasDefaultValue("VND")
                .IsRequired();

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(x => x.DisplayOrder)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);

            entity.HasOne(x => x.UpdatedByAdmin)
                .WithMany()
                .HasForeignKey(x => x.UpdatedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.IsActive);

            entity.HasIndex(x => x.DisplayOrder);


        });

        // =========================
        // JobCreditPackagePurchases
        // =========================
        modelBuilder.Entity<JobCreditPackagePurchase>(entity =>
        {
            entity.ToTable("JobCreditPackagePurchases", table =>
            {
                table.HasCheckConstraint(
                    "CK_JobCreditPackagePurchases_CreditsAndPrice",
                    "[JobPostCreditsAdded] > 0 AND [AiGenerationCreditsAdded] >= 0 AND [PricePaid] >= 0"
                );

                table.HasCheckConstraint(
                    "CK_JobCreditPackagePurchases_Status",
                    "[Status] IN ('SUCCESS','FAILED','CANCELLED')"
                );
            });

            entity.HasKey(x => x.JobCreditPackagePurchaseId);

            entity.Property(x => x.PackageNameSnapshot)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.DescriptionSnapshot)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.JobPostCreditsAdded)
                .IsRequired();

            entity.Property(x => x.AiGenerationCreditsAdded)
                .IsRequired();

            entity.Property(x => x.PricePaid)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(x => x.Currency)
                .HasMaxLength(10)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.TransactionReferenceId)
                .HasMaxLength(100)
                .IsRequired();

            entity.HasIndex(x => x.TransactionReferenceId)
                .IsUnique();

            entity.Property(x => x.PurchasedAt)
                .IsRequired();

            entity.HasOne(x => x.ClientProfile)
                .WithMany()
                .HasForeignKey(x => x.ClientProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.JobCreditPackage)
                .WithMany(x => x.Purchases)
                .HasForeignKey(x => x.JobCreditPackageId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.ClientProfileId);

            entity.HasIndex(x => x.JobCreditPackageId);

            entity.HasIndex(x => x.PurchasedAt);
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

            entity.HasIndex(x => x.BusinessEmail)
                .IsUnique()
                .HasFilter("[BusinessEmail] IS NOT NULL");

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

            entity.Property(x => x.ProfileCompletenessScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.AiSkillRelevanceScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.ExperienceCredibilityScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.PortfolioEvidenceScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.GitHubEvidenceScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.LinkedInEvidenceScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.CertificateEvidenceScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.TrustRiskScore)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(0)
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

            entity.Property(x => x.FreeProposalSubmitUsedCount)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.ProposalSubmitCredits)
                .HasDefaultValue(0)
                .IsRequired();

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

            entity.HasIndex(x => x.CertificateUrl);

            entity.Property(x => x.CertificateType)
                .HasMaxLength(50)
                .HasDefaultValue("OTHER")
                .IsRequired();

            entity.Property(x => x.CertificateName)
                .HasMaxLength(255)
                .HasDefaultValue(string.Empty)
                .IsRequired();

            entity.Property(x => x.CertificateIssuer)
                .HasMaxLength(255)
                .HasDefaultValue(string.Empty)
                .IsRequired();

            entity.Property(x => x.CertificateUrl)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.IssuedAt);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.VerificationStatus)
                .HasMaxLength(30)
                .HasDefaultValue("NEEDS_REVIEW")
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

            entity.Property(x => x.DetectedHolderName)
                .HasMaxLength(255);

            entity.Property(x => x.DetectedIssuedDateText)
                .HasMaxLength(100);

            entity.Property(x => x.DetectedIssuedAt);

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

            entity.Property(x => x.PostingChargeType)
                .HasMaxLength(20)
                .HasDefaultValue("NONE")
                .IsRequired();

            entity.Property(x => x.PublishedAt);

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
                    "[Status] IN ('DRAFT','SUBMITTED','ACCEPTED','REJECTED','WITHDRAWN')");

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
        // ProposalCreditPackages
        // =========================
        modelBuilder.Entity<ProposalCreditPackage>(entity =>
        {
            entity.ToTable("ProposalCreditPackages", table =>
            {
                table.HasCheckConstraint(
                    "CK_ProposalCreditPackages_CreditsAndPrice",
                    "[ProposalSubmitCredits] > 0 AND [Price] >= 0"
                );
            });

            entity.HasKey(x => x.ProposalCreditPackageId);

            entity.Property(x => x.PackageName)
                .HasMaxLength(100)
                .IsRequired();

            entity.HasIndex(x => x.PackageName)
                .IsUnique();

            entity.Property(x => x.Description)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.ProposalSubmitCredits)
                .IsRequired();

            entity.Property(x => x.Price)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(x => x.Currency)
                .HasMaxLength(10)
                .HasDefaultValue("VND")
                .IsRequired();

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(x => x.DisplayOrder)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.UpdatedAt);

            entity.HasOne(x => x.UpdatedByAdmin)
                .WithMany()
                .HasForeignKey(x => x.UpdatedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.IsActive);

            entity.HasIndex(x => x.DisplayOrder);


        });

        // =========================
        // ProposalCreditPackagePurchases
        // =========================
        modelBuilder.Entity<ProposalCreditPackagePurchase>(entity =>
        {
            entity.ToTable("ProposalCreditPackagePurchases", table =>
            {
                table.HasCheckConstraint(
                    "CK_ProposalCreditPackagePurchases_CreditsAndPrice",
                    "[ProposalSubmitCreditsAdded] > 0 AND [PricePaid] >= 0"
                );

                table.HasCheckConstraint(
                    "CK_ProposalCreditPackagePurchases_Status",
                    "[Status] IN ('SUCCESS','FAILED','CANCELLED')"
                );
            });

            entity.HasKey(x => x.ProposalCreditPackagePurchaseId);

            entity.Property(x => x.PackageNameSnapshot)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(x => x.DescriptionSnapshot)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.ProposalSubmitCreditsAdded)
                .IsRequired();

            entity.Property(x => x.PricePaid)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            entity.Property(x => x.Currency)
                .HasMaxLength(10)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.TransactionReferenceId)
                .HasMaxLength(100)
                .IsRequired();

            entity.HasIndex(x => x.TransactionReferenceId)
                .IsUnique();

            entity.Property(x => x.PurchasedAt)
                .IsRequired();

            entity.HasOne(x => x.ExpertProfile)
                .WithMany()
                .HasForeignKey(x => x.ExpertProfileId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ProposalCreditPackage)
                .WithMany(x => x.Purchases)
                .HasForeignKey(x => x.ProposalCreditPackageId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.ExpertProfileId);

            entity.HasIndex(x => x.ProposalCreditPackageId);

            entity.HasIndex(x => x.PurchasedAt);
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
                "[FinalPrice] > 0 AND [PlatformFeeRate] >= 0 AND [PlatformFeeAmount] >= 0 AND [TotalClientPayment] = [FinalPrice] + [PlatformFeeAmount] AND [ExpertFeeRate] >= 0 AND [ExpertFeeAmount] >= 0 AND [ExpertReceivableAmount] = [FinalPrice] - [ExpertFeeAmount] AND [FinalTimelineDays] > 0");
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

            entity.Property(e => e.ExpertFeeRate)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(15.00m)
                .IsRequired();

            entity.Property(e => e.ExpertFeeAmount)
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(0m)
                .IsRequired();

            entity.Property(e => e.ExpertReceivableAmount)
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(0m)
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

            entity.Property(e => e.SignDeadlineAt);

            entity.Property(e => e.SignExpiredAt);

            entity.Property(e => e.CreatedAt)
                .IsRequired();

            entity.HasIndex(e => e.ClientId);

            entity.HasIndex(e => e.ExpertId);

            entity.HasIndex(e => e.Status);

            entity.HasIndex(e => e.SignDeadlineAt);

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

            entity.Property(e => e.EscrowLockedAt);

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
                "CK_Milestones_DurationDays",
                "[DurationDays] > 0");

                t.HasCheckConstraint(
                "CK_Milestones_Revision",
                "[RevisionUsed] >= 0");

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

            entity.Property(e => e.DurationDays)
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
                "[AvailableBalance] >= 0 AND [LockedBalance] >= 0 AND [PendingEarningsBalance] >= 0 AND [TotalEarning] >= 0");
            });

            entity.HasKey(w => w.WalletId);

            entity.Property(w => w.AvailableBalance)
                .HasColumnType("decimal(18,2)");

            entity.Property(w => w.LockedBalance)
                .HasColumnType("decimal(18,2)");

            entity.Property(w => w.PendingEarningsBalance)
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
        // PlatformWallet
        // =========================
        modelBuilder.Entity<PlatformWallet>(entity =>
        {
            entity.ToTable("PlatformWallets", table =>
            {
                table.HasCheckConstraint(
                    "CK_PlatformWallets_Balances",
                    "[AvailableBalance] >= 0 AND [TotalRevenue] >= 0 AND [PlatformFeeRevenue] >= 0 AND [WithdrawalFeeRevenue] >= 0");
            });

            entity.HasKey(x => x.PlatformWalletId);

            entity.Property(x => x.WalletCode)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasIndex(x => x.WalletCode)
                .IsUnique();

            entity.Property(x => x.AvailableBalance)
                .HasColumnType("decimal(18,2)");

            entity.Property(x => x.TotalRevenue)
                .HasColumnType("decimal(18,2)");

            entity.Property(x => x.PlatformFeeRevenue)
                .HasColumnType("decimal(18,2)");

            entity.Property(x => x.WithdrawalFeeRevenue)
                .HasColumnType("decimal(18,2)");

            entity.Property(x => x.AdjustmentBalance)
                .HasColumnType("decimal(18,2)");


        });

        // =========================
        // PlatformTransaction
        // =========================
        modelBuilder.Entity<PlatformTransaction>(entity =>
        {
            entity.ToTable("PlatformTransactions", table =>
            {
                table.HasCheckConstraint(
                    "CK_PlatformTransactions_Amount",
                    "[Amount] > 0");
            });

            entity.HasKey(x => x.PlatformTransactionId);

            entity.Property(x => x.Type)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.Description)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.ReferenceId)
                .HasMaxLength(100);

            entity.Property(x => x.Amount)
                .HasColumnType("decimal(18,2)");

            entity.HasIndex(x => x.Type);

            entity.HasIndex(x => x.Status);

            entity.HasIndex(x => x.ReferenceId);

            entity.HasIndex(x => x.ProjectId);

            entity.HasIndex(x => x.ContractId);

            entity.HasIndex(x => x.WithdrawalRequestId);

            entity.HasOne(x => x.PlatformWallet)
                .WithMany(x => x.Transactions)
                .HasForeignKey(x => x.PlatformWalletId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Project)
                .WithMany()
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Contract)
                .WithMany()
                .HasForeignKey(x => x.ContractId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.WithdrawalRequest)
                .WithMany()
                .HasForeignKey(x => x.WithdrawalRequestId)
                .OnDelete(DeleteBehavior.SetNull);
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

                t.HasCheckConstraint(
                "CK_Deliverables_DemoValidationStatus",
                "[DemoValidationStatus] IS NULL OR [DemoValidationStatus] IN ('VALID','AUTH_REQUIRED')");

                t.HasCheckConstraint(
                "CK_Deliverables_TestValidationStatus",
                "[TestValidationStatus] IS NULL OR [TestValidationStatus] IN ('VALID','AUTH_REQUIRED')");
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

            entity.Property(d => d.DemoInstructions)
                .HasMaxLength(2000);

            entity.Property(d => d.DemoValidationStatus)
                .HasMaxLength(30);

            entity.Property(d => d.TestResultUrl)
                .HasMaxLength(500);

            entity.Property(d => d.TestSummary)
                .HasMaxLength(2000);

            entity.Property(d => d.TestValidationStatus)
                .HasMaxLength(30);

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
        // Deliverable Artifact
        // =========================
        modelBuilder.Entity<DeliverableArtifact>(entity =>
        {
            entity.ToTable("DeliverableArtifacts", t =>
            {
                t.HasCheckConstraint(
                    "CK_DeliverableArtifacts_ArtifactType",
                    "[ArtifactType] IN ('FILE','FOLDER','ARCHIVE','SOURCE_REPOSITORY','DOCUMENTATION','DESIGN','DATASET','MODEL','BUILD','OTHER')");

                t.HasCheckConstraint(
                    "CK_DeliverableArtifacts_AccessLevel",
                    "[AccessLevel] IN ('PUBLIC','RESTRICTED')");

                t.HasCheckConstraint(
                    "CK_DeliverableArtifacts_ValidationStatus",
                    "[ValidationStatus] IN ('VALID','AUTH_REQUIRED')");
            });

            entity.HasKey(x => x.DeliverableArtifactId);

            entity.Property(x => x.ArtifactType)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(x => x.Label)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.Url)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.Provider)
                .HasMaxLength(100);

            entity.Property(x => x.AccessLevel)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.Version)
                .HasMaxLength(100);

            entity.Property(x => x.CommitHash)
                .HasMaxLength(100);

            entity.Property(x => x.Checksum)
                .HasMaxLength(200);

            entity.Property(x => x.ValidationStatus)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.HasIndex(x => x.DeliverableId);

            entity.HasIndex(x => new
            {
                x.DeliverableId,
                x.Url
            }).IsUnique();

            entity.HasOne(x => x.Deliverable)
                .WithMany(x => x.Artifacts)
                .HasForeignKey(x => x.DeliverableId)
                .OnDelete(DeleteBehavior.Cascade);
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

            entity.HasIndex(d => d.DeliverableId);

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

            entity.HasOne(d => d.Deliverable)
                .WithMany()
                .HasForeignKey(d => d.DeliverableId)
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

            entity.Property(r => r.Status)
                .HasMaxLength(20)
                .HasDefaultValue("VISIBLE")
                .IsRequired();

            entity.Property(r => r.HiddenReason)
                .HasMaxLength(1000);

            entity.Property(r => r.HiddenAt);

            entity.Property(r => r.HiddenByAdminId);

            entity.Property(r => r.CreatedAt)
                .IsRequired();

            entity.HasIndex(r => r.ProjectId)
                .IsUnique();

            entity.HasIndex(r => r.ExpertId);

            entity.HasIndex(r => r.ClientId);

            entity.HasIndex(r => r.Status);

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

            entity.HasOne(r => r.HiddenByAdmin)
                .WithMany()
                .HasForeignKey(r => r.HiddenByAdminId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // ReviewReport
        // =========================
        modelBuilder.Entity<ReviewReport>(entity =>
        {
            entity.ToTable("ReviewReports");

            entity.HasKey(x => x.ReviewReportId);

            entity.Property(x => x.Reason)
                .HasMaxLength(1000)
                .IsRequired();

            entity.Property(x => x.Status)
                .HasMaxLength(20)
                .HasDefaultValue("OPEN")
                .IsRequired();

            entity.Property(x => x.AdminDecision)
                .HasMaxLength(1000);

            entity.Property(x => x.CreatedAt)
                .IsRequired();

            entity.Property(x => x.ResolvedAt);

            entity.HasIndex(x => x.ReviewId);

            entity.HasIndex(x => x.ProjectId);

            entity.HasIndex(x => x.ExpertUserId);

            entity.HasIndex(x => x.Status);

            entity.HasIndex(x => new { x.ReviewId, x.Status })
                .IsUnique()
                .HasFilter("[Status] = 'OPEN'");

            entity.HasOne(x => x.Review)
                .WithMany(x => x.ReviewReports)
                .HasForeignKey(x => x.ReviewId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Project)
                .WithMany()
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ExpertUser)
                .WithMany()
                .HasForeignKey(x => x.ExpertUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ResolvedByAdmin)
                .WithMany()
                .HasForeignKey(x => x.ResolvedByAdminId)
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

            entity.Property(n => n.RelatedEntityType)
                .HasMaxLength(50);

            entity.Property(n => n.RelatedEntityId);

            entity.Property(n => n.RelatedJobId);

            entity.Property(n => n.RelatedProposalId);

            entity.Property(n => n.RelatedContractId);

            entity.Property(n => n.RelatedProjectId);

            entity.Property(n => n.RelatedMilestoneId);

            entity.Property(n => n.RelatedDeliverableId);

            entity.Property(n => n.RelatedDisputeId);

            entity.Property(n => n.RelatedConversationId);

            entity.HasIndex(n => new
            {
                n.RelatedEntityType,
                n.RelatedEntityId
            });

            entity.HasIndex(n => n.RelatedConversationId);
            entity.HasIndex(n => n.RelatedProposalId);
            entity.HasIndex(n => n.RelatedProjectId);
            entity.HasIndex(n => n.RelatedMilestoneId);
            entity.HasIndex(n => n.RelatedDeliverableId);
            entity.HasIndex(n => n.RelatedDisputeId);

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

            entity.Property(w => w.BankBin)
                .HasMaxLength(20)
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

            entity.Property(w => w.PayoutProvider)
                .HasMaxLength(30);

            entity.Property(w => w.PayOsPayoutId)
                .HasMaxLength(100);

            entity.Property(w => w.PayOsTransactionId)
                .HasMaxLength(100);

            entity.Property(w => w.PayOsReferenceId)
                .HasMaxLength(100);

            entity.Property(w => w.PayOsIdempotencyKey)
                .HasMaxLength(100);

            entity.Property(w => w.PayOsApprovalState)
                .HasMaxLength(50);

            entity.Property(w => w.PayOsTransactionState)
                .HasMaxLength(50);

            entity.Property(w => w.PayOsRawResponse)
                .HasColumnType("nvarchar(max)");

            entity.Property(w => w.FailureReason)
                .HasMaxLength(1000);

            entity.Property(w => w.PayoutRequestedAt);

            entity.Property(w => w.PayoutConfirmedAt);

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

            entity.HasIndex(w => w.PayoutProvider);

            entity.HasIndex(w => w.PayOsPayoutId)
                .IsUnique()
                .HasFilter("[PayOsPayoutId] IS NOT NULL");

            entity.HasIndex(w => w.PayOsReferenceId)
                .IsUnique()
                .HasFilter("[PayOsReferenceId] IS NOT NULL");

            entity.HasIndex(w => w.PayOsIdempotencyKey)
                .IsUnique()
                .HasFilter("[PayOsIdempotencyKey] IS NOT NULL");

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

        ApplyUtcDateTimeConverters(modelBuilder);
    }

    private static void ApplyUtcDateTimeConverters(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                // Certificate issue dates are calendar dates, not UTC timestamps.
                if (entityType.ClrType == typeof(ExpertCertificate) &&
                    (property.Name == nameof(ExpertCertificate.IssuedAt) ||
                     property.Name == nameof(ExpertCertificate.DetectedIssuedAt)))
                {
                    continue;
                }

                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(new UtcDateTimeConverter());
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(new NullableUtcDateTimeConverter());
                }
            }
        }
    }
}