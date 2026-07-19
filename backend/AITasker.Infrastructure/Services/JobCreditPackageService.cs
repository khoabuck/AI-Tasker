using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class JobCreditPackageService : IJobCreditPackageService
{
    private const string UserRoleClient = "CLIENT";
    private const string UserStatusActive = "ACTIVE";
    private const string PurchaseStatusSuccess = "SUCCESS";
    private const string TransactionStatusSuccess = "SUCCESS";
    private const string TransactionTypeJobCreditPackagePurchase = "JOB_CREDIT_PACKAGE_PURCHASE";

    private readonly AITaskerDbContext _context;
    private readonly IAdminAuditLogService _adminAuditLogService;
    private readonly IJobPostingAiPolicyService _jobPostingAiPolicyService;

    public JobCreditPackageService(
        AITaskerDbContext context,
        IAdminAuditLogService adminAuditLogService,
        IJobPostingAiPolicyService jobPostingAiPolicyService)
    {
        _context = context;
        _adminAuditLogService = adminAuditLogService;
        _jobPostingAiPolicyService = jobPostingAiPolicyService;
    }

    public async Task<List<AvailableJobCreditPackageResponse>> GetActivePackagesAsync()
    {
        var policy = await _jobPostingAiPolicyService.GetActivePolicyAsync();

        var packages = await _context.JobCreditPackages
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Price)
            .ThenBy(x => x.JobCreditPackageId)
            .ToListAsync();

        var responses = new List<AvailableJobCreditPackageResponse>
        {
            MapFreePackage(policy)
        };

        responses.AddRange(packages.Select(MapAvailablePackage));
        return responses;
    }

    public async Task<List<JobCreditPackageResponse>> GetAdminPackagesAsync()
    {
        var packages = await _context.JobCreditPackages
            .AsNoTracking()
            .Include(x => x.UpdatedByAdmin)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Price)
            .ThenBy(x => x.JobCreditPackageId)
            .ToListAsync();

        return packages.Select(MapPackage).ToList();
    }

    public async Task<JobCreditPackageResponse?> GetPackageByIdAsync(int packageId)
    {
        var package = await _context.JobCreditPackages
            .AsNoTracking()
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.JobCreditPackageId == packageId);

        return package == null ? null : MapPackage(package);
    }

    public async Task<JobCreditPackageResponse> CreatePackageAsync(
        int adminId,
        CreateJobCreditPackageRequest request)
    {
        ValidatePackageRequest(
            request.PackageName,
            request.Description,
            request.JobPostCredits,
            request.AiGenerationCredits,
            request.Price,
            request.Currency,
            request.DisplayOrder,
            requireReason: false,
            request.Reason);

        var package = new JobCreditPackage
        {
            PackageName = request.PackageName.Trim(),
            Description = request.Description.Trim(),
            JobPostCredits = request.JobPostCredits,
            AiGenerationCredits = request.AiGenerationCredits,
            Price = Math.Round(request.Price, 2, MidpointRounding.AwayFromZero),
            Currency = NormalizeCurrency(request.Currency),
            IsActive = request.IsActive,
            DisplayOrder = request.DisplayOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UpdatedByAdminId = adminId
        };

        _context.JobCreditPackages.Add(package);
        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "CREATE_JOB_CREDIT_PACKAGE",
            nameof(JobCreditPackage),
            package.JobCreditPackageId,
            null,
            BuildAuditValue(package),
            request.Reason);

        return MapPackage(package);
    }

    public async Task<JobCreditPackageResponse?> UpdatePackageAsync(
        int adminId,
        int packageId,
        UpdateJobCreditPackageRequest request)
    {
        ValidatePackageRequest(
            request.PackageName,
            request.Description,
            request.JobPostCredits,
            request.AiGenerationCredits,
            request.Price,
            request.Currency,
            request.DisplayOrder,
            requireReason: true,
            request.Reason);

        var package = await _context.JobCreditPackages
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.JobCreditPackageId == packageId);

        if (package == null)
        {
            return null;
        }

        var oldValue = BuildAuditValue(package);

        package.PackageName = request.PackageName.Trim();
        package.Description = request.Description.Trim();
        package.JobPostCredits = request.JobPostCredits;
        package.AiGenerationCredits = request.AiGenerationCredits;
        package.Price = Math.Round(request.Price, 2, MidpointRounding.AwayFromZero);
        package.Currency = NormalizeCurrency(request.Currency);
        package.IsActive = request.IsActive;
        package.DisplayOrder = request.DisplayOrder;
        package.UpdatedAt = DateTime.UtcNow;
        package.UpdatedByAdminId = adminId;

        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UPDATE_JOB_CREDIT_PACKAGE",
            nameof(JobCreditPackage),
            package.JobCreditPackageId,
            oldValue,
            BuildAuditValue(package),
            request.Reason);

        return MapPackage(package);
    }

    public async Task<JobCreditPackageResponse?> SetPackageActiveAsync(
        int adminId,
        int packageId,
        bool isActive,
        string? reason)
    {
        ValidateReason(reason);

        var package = await _context.JobCreditPackages
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.JobCreditPackageId == packageId);

        if (package == null)
        {
            return null;
        }

        var oldValue = BuildAuditValue(package);

        package.IsActive = isActive;
        package.UpdatedAt = DateTime.UtcNow;
        package.UpdatedByAdminId = adminId;

        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            isActive ? "ACTIVATE_JOB_CREDIT_PACKAGE" : "DEACTIVATE_JOB_CREDIT_PACKAGE",
            nameof(JobCreditPackage),
            package.JobCreditPackageId,
            oldValue,
            BuildAuditValue(package),
            reason);

        return MapPackage(package);
    }

    public async Task<JobCreditPackagePurchaseResultResponse> PurchasePackageAsync(
        int userId,
        int packageId)
    {
        await using var dbTransaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var clientProfile = await _context.ClientProfiles
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (clientProfile == null)
            {
                throw new InvalidOperationException("Client profile not found.");
            }

            if (!string.Equals(clientProfile.User.Role, UserRoleClient, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only Client users can buy job credit packages.");
            }

            if (!string.Equals(clientProfile.User.Status, UserStatusActive, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only active Client users can buy job credit packages.");
            }

            var package = await _context.JobCreditPackages
                .FirstOrDefaultAsync(x =>
                    x.JobCreditPackageId == packageId &&
                    x.IsActive);

            if (package == null)
            {
                throw new InvalidOperationException("Job credit package not found or inactive.");
            }

            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (wallet == null)
            {
                wallet = new Wallet
                {
                    UserId = userId,
                    AvailableBalance = 0,
                    LockedBalance = 0,
                    TotalEarning = 0,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Wallets.Add(wallet);
                await _context.SaveChangesAsync();
            }

            if (wallet.AvailableBalance < package.Price)
            {
                throw new InvalidOperationException("Insufficient wallet balance. Please deposit before buying this package.");
            }

            var transactionReferenceId = $"JOBPKG_{Guid.NewGuid():N}";
            var now = DateTime.UtcNow;

            wallet.AvailableBalance -= package.Price;
            wallet.UpdatedAt = now;

            clientProfile.PaidJobPostCredits += package.JobPostCredits;
            clientProfile.PaidAiGenerationCredits += package.AiGenerationCredits;
            clientProfile.UpdatedAt = now;

            var purchase = new JobCreditPackagePurchase
            {
                ClientProfileId = clientProfile.ClientProfileId,
                JobCreditPackageId = package.JobCreditPackageId,
                PackageNameSnapshot = package.PackageName,
                DescriptionSnapshot = package.Description,
                JobPostCreditsAdded = package.JobPostCredits,
                AiGenerationCreditsAdded = package.AiGenerationCredits,
                PricePaid = package.Price,
                Currency = package.Currency,
                Status = PurchaseStatusSuccess,
                TransactionReferenceId = transactionReferenceId,
                PurchasedAt = now
            };

            _context.JobCreditPackagePurchases.Add(purchase);

            _context.Transactions.Add(new Transaction
            {
                UserId = userId,
                ProjectId = null,
                MilestoneId = null,
                EscrowId = null,
                Type = TransactionTypeJobCreditPackagePurchase,
                Amount = -package.Price,
                Status = TransactionStatusSuccess,
                Description = $"[Job Credit Package] Purchased {package.PackageName} package.",
                ReferenceId = transactionReferenceId,
                CreatedAt = now
            });

            await _context.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            return new JobCreditPackagePurchaseResultResponse
            {
                Purchase = MapPurchase(purchase),
                RemainingWalletBalance = wallet.AvailableBalance,
                RemainingFreeJobPostCredits = clientProfile.FreeJobPostCredits,
                RemainingPaidJobPostCredits = clientProfile.PaidJobPostCredits,
                RemainingFreeAiGenerationCredits = clientProfile.FreeAiGenerationCredits,
                RemainingPaidAiGenerationCredits = clientProfile.PaidAiGenerationCredits
            };
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<JobCreditPackagePurchaseResponse>> GetMyPurchasesAsync(int userId)
    {
        var clientProfile = await _context.ClientProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (clientProfile == null)
        {
            throw new InvalidOperationException("Client profile not found.");
        }

        var purchases = await _context.JobCreditPackagePurchases
            .AsNoTracking()
            .Where(x => x.ClientProfileId == clientProfile.ClientProfileId)
            .OrderByDescending(x => x.PurchasedAt)
            .ToListAsync();

        return purchases.Select(MapPurchase).ToList();
    }

    private static void ValidatePackageRequest(
        string packageName,
        string description,
        int jobPostCredits,
        int aiGenerationCredits,
        decimal price,
        string currency,
        int displayOrder,
        bool requireReason,
        string? reason)
    {
        if (string.IsNullOrWhiteSpace(packageName))
        {
            throw new InvalidOperationException("Package name is required.");
        }

        if (packageName.Trim().Length > 100)
        {
            throw new InvalidOperationException("Package name must be at most 100 characters.");
        }

        if (description.Trim().Length > 500)
        {
            throw new InvalidOperationException("Description must be at most 500 characters.");
        }

        if (jobPostCredits <= 0)
        {
            throw new InvalidOperationException("Job post credits must be greater than 0.");
        }

        if (aiGenerationCredits < 0)
        {
            throw new InvalidOperationException("AI generation credits cannot be negative.");
        }

        if (price < 0)
        {
            throw new InvalidOperationException("Package price cannot be negative.");
        }

        if (displayOrder < 0)
        {
            throw new InvalidOperationException("Display order cannot be negative.");
        }

        _ = NormalizeCurrency(currency);

        if (requireReason)
        {
            ValidateReason(reason);
        }
    }

    private static void ValidateReason(string? reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new InvalidOperationException("Reason is required for this admin action.");
        }

        if (reason.Trim().Length > 500)
        {
            throw new InvalidOperationException("Reason must be at most 500 characters.");
        }
    }

    private static string NormalizeCurrency(string currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            throw new InvalidOperationException("Currency is required.");
        }

        var normalized = currency.Trim().ToUpperInvariant();

        if (normalized.Length > 10)
        {
            throw new InvalidOperationException("Currency must be at most 10 characters.");
        }

        return normalized;
    }

    private static AvailableJobCreditPackageResponse MapFreePackage(
        JobPostingAiPolicyResponse policy)
    {
        return new AvailableJobCreditPackageResponse
        {
            JobCreditPackageId = null,
            PackageName = "Free",
            Description =
                $"{policy.InitialFreeJobPostCredits} free job posting credit(s) and " +
                $"{policy.InitialFreeAiGenerationCredits} free AI generation credit(s), granted once when a Client profile is created.",
            JobPostCredits = policy.InitialFreeJobPostCredits,
            AiGenerationCredits = policy.InitialFreeAiGenerationCredits,
            Price = 0,
            Currency = "VND",
            IsActive = policy.IsActive,
            IsFreeTier = true,
            IsPurchasable = false,
            DisplayOrder = 0,
            CreatedAt = policy.CreatedAt,
            UpdatedAt = policy.UpdatedAt,
            UpdatedByAdminId = policy.UpdatedByAdminId,
            UpdatedByAdminEmail = policy.UpdatedByAdminEmail,
            UpdatedByAdminFullName = policy.UpdatedByAdminFullName
        };
    }

    private static AvailableJobCreditPackageResponse MapAvailablePackage(
        JobCreditPackage package)
    {
        return new AvailableJobCreditPackageResponse
        {
            JobCreditPackageId = package.JobCreditPackageId,
            PackageName = package.PackageName,
            Description = package.Description,
            JobPostCredits = package.JobPostCredits,
            AiGenerationCredits = package.AiGenerationCredits,
            Price = package.Price,
            Currency = package.Currency,
            IsActive = package.IsActive,
            IsFreeTier = false,
            IsPurchasable = true,
            DisplayOrder = package.DisplayOrder,
            CreatedAt = package.CreatedAt,
            UpdatedAt = package.UpdatedAt,
            UpdatedByAdminId = package.UpdatedByAdminId,
            UpdatedByAdminEmail = package.UpdatedByAdmin?.Email,
            UpdatedByAdminFullName = package.UpdatedByAdmin?.FullName
        };
    }

    private static JobCreditPackageResponse MapPackage(JobCreditPackage package)
    {
        return new JobCreditPackageResponse
        {
            JobCreditPackageId = package.JobCreditPackageId,
            PackageName = package.PackageName,
            Description = package.Description,
            JobPostCredits = package.JobPostCredits,
            AiGenerationCredits = package.AiGenerationCredits,
            Price = package.Price,
            Currency = package.Currency,
            IsActive = package.IsActive,
            DisplayOrder = package.DisplayOrder,
            CreatedAt = package.CreatedAt,
            UpdatedAt = package.UpdatedAt,
            UpdatedByAdminId = package.UpdatedByAdminId,
            UpdatedByAdminEmail = package.UpdatedByAdmin?.Email,
            UpdatedByAdminFullName = package.UpdatedByAdmin?.FullName
        };
    }

    private static JobCreditPackagePurchaseResponse MapPurchase(JobCreditPackagePurchase purchase)
    {
        return new JobCreditPackagePurchaseResponse
        {
            JobCreditPackagePurchaseId = purchase.JobCreditPackagePurchaseId,
            JobCreditPackageId = purchase.JobCreditPackageId,
            PackageNameSnapshot = purchase.PackageNameSnapshot,
            DescriptionSnapshot = purchase.DescriptionSnapshot,
            JobPostCreditsAdded = purchase.JobPostCreditsAdded,
            AiGenerationCreditsAdded = purchase.AiGenerationCreditsAdded,
            PricePaid = purchase.PricePaid,
            Currency = purchase.Currency,
            Status = purchase.Status,
            TransactionReferenceId = purchase.TransactionReferenceId,
            PurchasedAt = purchase.PurchasedAt
        };
    }

    private static string BuildAuditValue(JobCreditPackage package)
    {
        return $"PackageName={package.PackageName}; " +
               $"JobPostCredits={package.JobPostCredits}; " +
               $"AiGenerationCredits={package.AiGenerationCredits}; " +
               $"Price={package.Price}; " +
               $"Currency={package.Currency}; " +
               $"IsActive={package.IsActive}; " +
               $"DisplayOrder={package.DisplayOrder}";
    }
}
