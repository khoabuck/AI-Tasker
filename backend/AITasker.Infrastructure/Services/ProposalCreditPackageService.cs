using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Domain.Constants;
using AITasker.Infrastructure.Data;
using AITasker.Infrastructure.Banking;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class ProposalCreditPackageService : IProposalCreditPackageService
{
    private const string UserRoleExpert = "EXPERT";
    private const string UserStatusActive = "ACTIVE";
    private const string PurchaseStatusSuccess = "SUCCESS";
    private const string TransactionStatusSuccess = "SUCCESS";
    private const string TransactionTypeProposalCreditPackagePurchase = "PROPOSAL_CREDIT_PACKAGE_PURCHASE";

    private readonly AITaskerDbContext _context;
    private readonly IAdminAuditLogService _adminAuditLogService;
    private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;
    private readonly INotificationService _notificationService;

    public ProposalCreditPackageService(
        AITaskerDbContext context,
        IAdminAuditLogService adminAuditLogService,
        IMarketplaceWorkflowPolicyService workflowPolicyService,
        INotificationService notificationService)
    {
        _context = context;
        _adminAuditLogService = adminAuditLogService;
        _workflowPolicyService = workflowPolicyService;
        _notificationService = notificationService;
    }

    public async Task<List<ProposalCreditPackageResponse>> GetActivePackagesAsync()
    {
        var packages = await _context.ProposalCreditPackages
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Price)
            .ThenBy(x => x.ProposalCreditPackageId)
            .ToListAsync();

        return packages.Select(MapPackage).ToList();
    }

    public async Task<ProposalCreditPackagePageResponse> GetMyCreditPageAsync(int userId)
    {
        var expert = await _context.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (expert == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        if (!string.Equals(expert.User.Role, UserRoleExpert, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only Expert users can view proposal credit packages.");
        }

        var wallet = await _context.Wallets
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);

        var walletBalance = wallet?.AvailableBalance ?? 0;

        var policy = await _workflowPolicyService.GetActivePolicyAsync();

        var activePackages = await _context.ProposalCreditPackages
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Price)
            .ThenBy(x => x.ProposalCreditPackageId)
            .ToListAsync();

        var recentPurchases = await _context.ProposalCreditPackagePurchases
            .AsNoTracking()
            .Where(x => x.ExpertProfileId == expert.ExpertProfileId)
            .OrderByDescending(x => x.PurchasedAt)
            .Take(10)
            .ToListAsync();

        var recentTransactions = await _context.Transactions
            .AsNoTracking()
            .Where(x =>
                x.UserId == userId &&
                x.Type == TransactionTypeProposalCreditPackagePurchase)
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .ToListAsync();

        var latestPurchase = recentPurchases.FirstOrDefault();
        var currentTier = latestPurchase?.PackageNameSnapshot ?? "Free";

        var freeTotal = Math.Max(policy.FreeProposalSubmitCount, 0);
        var freeUsed = Math.Clamp(expert.FreeProposalSubmitUsedCount, 0, freeTotal);
        var freeRemaining = Math.Max(freeTotal - freeUsed, 0);

        var canSubmitProposal = freeRemaining > 0 || expert.ProposalSubmitCredits > 0;

        var packages = new List<ProposalCreditPackageCardResponse>
        {
            new ProposalCreditPackageCardResponse
            {
                ProposalCreditPackageId = null,
                PackageName = "Free",
                Description = "5 free proposal submissions granted to new experts.",
                ProposalSubmitCredits = policy.FreeProposalSubmitCount,
                Price = 0,
                Currency = "VND",
                IsFreePackage = true,
                IsActive = true,
                DisplayOrder = 0,
                CanPurchase = false,
                WalletAvailableBalance = walletBalance,
                InsufficientAmount = 0,
                PurchaseDisabledReason = "Free proposal submissions are granted automatically."
            }
        };

        packages.AddRange(activePackages.Select(package =>
        {
            var insufficientAmount = Math.Max(0, package.Price - walletBalance);

            return new ProposalCreditPackageCardResponse
            {
                ProposalCreditPackageId = package.ProposalCreditPackageId,
                PackageName = package.PackageName,
                Description = package.Description,
                ProposalSubmitCredits = package.ProposalSubmitCredits,
                Price = package.Price,
                Currency = package.Currency,
                IsFreePackage = false,
                IsActive = package.IsActive,
                DisplayOrder = package.DisplayOrder,
                CanPurchase = walletBalance >= package.Price,
                WalletAvailableBalance = walletBalance,
                InsufficientAmount = insufficientAmount,
                PurchaseDisabledReason = insufficientAmount > 0
                    ? $"Insufficient wallet balance. You need {insufficientAmount:N0} {package.Currency} more to buy this package."
                    : null
            };
        }));

        return new ProposalCreditPackagePageResponse
        {
            WalletAvailableBalance = walletBalance,
            CurrentCreditTier = currentTier,
            FreeProposalSubmitTotal = freeTotal,
            FreeProposalSubmitUsedCount = freeUsed,
            FreeProposalSubmitRemaining = freeRemaining,
            ProposalSubmitCredits = expert.ProposalSubmitCredits,
            CanSubmitProposal = canSubmitProposal,
            Packages = packages,
            RecentPurchases = recentPurchases.Select(MapPurchase).ToList(),
            RecentTransactions = recentTransactions.Select(MapTransaction).ToList(),
            Warnings = BuildCreditWarnings(expert.ProposalSubmitCredits, currentTier)
        };
    }

    public async Task<List<ProposalCreditPackageResponse>> GetAdminPackagesAsync()
    {
        var packages = await _context.ProposalCreditPackages
            .AsNoTracking()
            .Include(x => x.UpdatedByAdmin)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Price)
            .ThenBy(x => x.ProposalCreditPackageId)
            .ToListAsync();

        return packages.Select(MapPackage).ToList();
    }

    public async Task<ProposalCreditPackageResponse?> GetPackageByIdAsync(int packageId)
    {
        var package = await _context.ProposalCreditPackages
            .AsNoTracking()
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.ProposalCreditPackageId == packageId);

        return package == null ? null : MapPackage(package);
    }

    public async Task<ProposalCreditPackageResponse> CreatePackageAsync(
        int adminId,
        CreateProposalCreditPackageRequest request)
    {
        ValidatePackageRequest(
            request.PackageName,
            request.Description,
            request.ProposalSubmitCredits,
            request.Price,
            request.Currency,
            request.DisplayOrder,
            requireReason: false,
            request.Reason);

        var package = new ProposalCreditPackage
        {
            PackageName = request.PackageName.Trim(),
            Description = request.Description.Trim(),
            ProposalSubmitCredits = request.ProposalSubmitCredits,
            Price = Math.Round(request.Price, 2, MidpointRounding.AwayFromZero),
            Currency = NormalizeCurrency(request.Currency),
            IsActive = request.IsActive,
            DisplayOrder = request.DisplayOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UpdatedByAdminId = adminId
        };

        _context.ProposalCreditPackages.Add(package);
        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "CREATE_PROPOSAL_CREDIT_PACKAGE",
            nameof(ProposalCreditPackage),
            package.ProposalCreditPackageId,
            null,
            BuildAuditValue(package),
            request.Reason);

        return MapPackage(package);
    }

    public async Task<ProposalCreditPackageResponse?> UpdatePackageAsync(
        int adminId,
        int packageId,
        UpdateProposalCreditPackageRequest request)
    {
        ValidatePackageRequest(
            request.PackageName,
            request.Description,
            request.ProposalSubmitCredits,
            request.Price,
            request.Currency,
            request.DisplayOrder,
            requireReason: true,
            request.Reason);

        var package = await _context.ProposalCreditPackages
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.ProposalCreditPackageId == packageId);

        if (package == null)
        {
            return null;
        }

        var oldValue = BuildAuditValue(package);

        package.PackageName = request.PackageName.Trim();
        package.Description = request.Description.Trim();
        package.ProposalSubmitCredits = request.ProposalSubmitCredits;
        package.Price = Math.Round(request.Price, 2, MidpointRounding.AwayFromZero);
        package.Currency = NormalizeCurrency(request.Currency);
        package.IsActive = request.IsActive;
        package.DisplayOrder = request.DisplayOrder;
        package.UpdatedAt = DateTime.UtcNow;
        package.UpdatedByAdminId = adminId;

        await _context.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UPDATE_PROPOSAL_CREDIT_PACKAGE",
            nameof(ProposalCreditPackage),
            package.ProposalCreditPackageId,
            oldValue,
            BuildAuditValue(package),
            request.Reason);

        return MapPackage(package);
    }

    public async Task<ProposalCreditPackageResponse?> SetPackageActiveAsync(
        int adminId,
        int packageId,
        bool isActive,
        string? reason)
    {
        ValidateReason(reason);

        var package = await _context.ProposalCreditPackages
            .Include(x => x.UpdatedByAdmin)
            .FirstOrDefaultAsync(x => x.ProposalCreditPackageId == packageId);

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
            isActive
                ? "ACTIVATE_PROPOSAL_CREDIT_PACKAGE"
                : "DEACTIVATE_PROPOSAL_CREDIT_PACKAGE",
            nameof(ProposalCreditPackage),
            package.ProposalCreditPackageId,
            oldValue,
            BuildAuditValue(package),
            reason);

        return MapPackage(package);
    }

    public async Task<ProposalCreditPackagePurchaseResultResponse> PurchasePackageAsync(
        int userId,
        int packageId)
    {
        await using var dbTransaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var expert = await _context.ExpertProfiles
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (expert == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            if (!string.Equals(expert.User.Role, UserRoleExpert, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only Expert users can buy proposal credit packages.");
            }

            if (!string.Equals(expert.User.Status, UserStatusActive, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only active Expert users can buy proposal credit packages.");
            }

            var package = await _context.ProposalCreditPackages
                .FirstOrDefaultAsync(x =>
                    x.ProposalCreditPackageId == packageId &&
                    x.IsActive);

            if (package == null)
            {
                throw new InvalidOperationException("Proposal credit package not found or inactive.");
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
                var missingAmount = package.Price - wallet.AvailableBalance;

                throw new InvalidOperationException(
                    $"Insufficient wallet balance. You need {missingAmount:N0} {package.Currency} more to buy this package.");
            }

            var transactionReferenceId = $"PROPPKG_{Guid.NewGuid():N}";
            var now = DateTime.UtcNow;

            wallet.AvailableBalance -= package.Price;
            wallet.UpdatedAt = now;

            expert.ProposalSubmitCredits += package.ProposalSubmitCredits;
            expert.UpdatedAt = now;

            var purchase = new ProposalCreditPackagePurchase
            {
                ExpertProfileId = expert.ExpertProfileId,
                ProposalCreditPackageId = package.ProposalCreditPackageId,
                PackageNameSnapshot = package.PackageName,
                DescriptionSnapshot = package.Description,
                ProposalSubmitCreditsAdded = package.ProposalSubmitCredits,
                PricePaid = package.Price,
                Currency = package.Currency,
                Status = PurchaseStatusSuccess,
                TransactionReferenceId = transactionReferenceId,
                PurchasedAt = now
            };

            _context.ProposalCreditPackagePurchases.Add(purchase);

            _context.Transactions.Add(new Transaction
            {
                UserId = userId,
                ProjectId = null,
                MilestoneId = null,
                EscrowId = null,
                Type = TransactionTypeProposalCreditPackagePurchase,
                Amount = -package.Price,
                Status = TransactionStatusSuccess,
                Description = $"[Proposal Credit Package] Purchased {package.PackageName} package.",
                ReferenceId = transactionReferenceId,
                CreatedAt = now
            });

            await _context.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            await NotifyProposalCreditPackagePurchasedAsync(
                userId,
                package,
                expert,
                wallet.AvailableBalance);

            var policy = await _workflowPolicyService.GetActivePolicyAsync();

            var freeTotal = Math.Max(policy.FreeProposalSubmitCount, 0);
            var freeUsed = Math.Clamp(expert.FreeProposalSubmitUsedCount, 0, freeTotal);
            var freeRemaining = Math.Max(freeTotal - freeUsed, 0);

            return new ProposalCreditPackagePurchaseResultResponse
            {
                Purchase = MapPurchase(purchase),
                RemainingWalletBalance = wallet.AvailableBalance,
                FreeProposalSubmitTotal = freeTotal,
                FreeProposalSubmitUsedCount = freeUsed,
                FreeProposalSubmitRemaining = freeRemaining,
                ProposalSubmitCredits = expert.ProposalSubmitCredits,
                CanSubmitProposal = freeRemaining > 0 || expert.ProposalSubmitCredits > 0,
                Warnings = BuildCreditWarnings(expert.ProposalSubmitCredits, package.PackageName)
            };
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<ProposalCreditPackagePurchaseResponse>> GetMyPurchasesAsync(int userId)
    {
        var expert = await _context.ExpertProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (expert == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        var purchases = await _context.ProposalCreditPackagePurchases
            .AsNoTracking()
            .Where(x => x.ExpertProfileId == expert.ExpertProfileId)
            .OrderByDescending(x => x.PurchasedAt)
            .ToListAsync();

        return purchases.Select(MapPurchase).ToList();
    }

    private static void ValidatePackageRequest(
        string packageName,
        string description,
        int proposalSubmitCredits,
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

        if (proposalSubmitCredits <= 0)
        {
            throw new InvalidOperationException("Proposal submit credits must be greater than 0.");
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

    private async Task NotifyProposalCreditPackagePurchasedAsync(
        int userId,
        ProposalCreditPackage package,
        ExpertProfile expert,
        decimal remainingWalletBalance)
    {
        try
        {
            await _notificationService.CreateNotificationAsync(
                userId,
                "Purchased the proposal credit package successfully.",
                $"You have successfully purchased the {package.PackageName} package. " +
                $"You have received {package.ProposalSubmitCredits} proposal submissions. " +
                $"Remaining wallet balance: {remainingWalletBalance:N0} {package.Currency}.",
                NotificationTypes.ProposalCreditPackagePurchased,
                relatedEntityType: "PROPOSAL_CREDIT_PACKAGE",
                relatedEntityId: package.ProposalCreditPackageId);

            var warnings = BuildCreditWarnings(
                expert.ProposalSubmitCredits,
                package.PackageName);

            foreach (var warning in warnings)
            {
                await _notificationService.CreateNotificationAsync(
                    userId,
                    "Proposal credit warning",
                    warning.Message,
                    NotificationTypes.ProposalCreditLow,
                    relatedEntityType: "PROPOSAL_CREDIT",
                    relatedEntityId: expert.ExpertProfileId);
            }
        }
        catch
        {
        }
    }

    private static List<ProposalCreditWarningResponse> BuildCreditWarnings(
        int proposalSubmitCredits,
        string? currentTier)
    {
        var threshold = ResolveProposalCreditWarningThreshold(currentTier);

        if (proposalSubmitCredits > threshold)
        {
            return new List<ProposalCreditWarningResponse>();
        }

        return new List<ProposalCreditWarningResponse>
        {
            new ProposalCreditWarningResponse
            {
                Code = proposalSubmitCredits <= 0
                    ? "PROPOSAL_CREDIT_EMPTY"
                    : "PROPOSAL_CREDIT_LOW",
                Severity = proposalSubmitCredits <= 0 ? "ERROR" : "WARNING",
                Remaining = proposalSubmitCredits,
                Threshold = threshold,
                Message = proposalSubmitCredits <= 0
                    ? "You have used up all your proposal submissions. Please purchase additional proposal credit to continue submitting proposals."
                    : $"You only have {proposalSubmitCredits} proposal submissions left. Please consider purchasing additional proposal credit."
            }
        };
    }

    private static int ResolveProposalCreditWarningThreshold(string? tier)
    {
        var normalizedTier = tier?.Trim().ToUpperInvariant() ?? string.Empty;

        return normalizedTier switch
        {
            "BASIC" => 1,
            "PRO" => 3,
            "BUSINESS" => 5,
            _ => 0
        };
    }

    private static TransactionResponse MapTransaction(Transaction transaction)
    {
        var display = TransactionDisplayResolver.Resolve(
            transaction.Type,
            transaction.Status,
            transaction.Description,
            transaction.ReferenceId,
            context: null);

        return new TransactionResponse
        {
            TransactionId = transaction.TransactionId,
            EscrowId = transaction.EscrowId,
            ProjectId = transaction.ProjectId,
            MilestoneId = transaction.MilestoneId,
            UserId = transaction.UserId,
            Type = transaction.Type,
            Category = display.Category,
            StatusGroup = display.StatusGroup,
            Amount = transaction.Amount,
            Status = transaction.Status,
            Description = transaction.Description,
            DisplayTitle = display.DisplayTitle,
            DisplaySubtitle = display.DisplaySubtitle,
            DisplayDescription = display.DisplayDescription,
            ReferenceType = display.ReferenceType,
            ReferenceDisplayName = display.ReferenceDisplayName,
            ReferenceId = transaction.ReferenceId,
            CreatedAt = transaction.CreatedAt
        };
    }

    private static ProposalCreditPackageResponse MapPackage(ProposalCreditPackage package)
    {
        return new ProposalCreditPackageResponse
        {
            ProposalCreditPackageId = package.ProposalCreditPackageId,
            PackageName = package.PackageName,
            Description = package.Description,
            ProposalSubmitCredits = package.ProposalSubmitCredits,
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

    private static ProposalCreditPackagePurchaseResponse MapPurchase(
        ProposalCreditPackagePurchase purchase)
    {
        return new ProposalCreditPackagePurchaseResponse
        {
            ProposalCreditPackagePurchaseId = purchase.ProposalCreditPackagePurchaseId,
            ProposalCreditPackageId = purchase.ProposalCreditPackageId,
            PackageNameSnapshot = purchase.PackageNameSnapshot,
            DescriptionSnapshot = purchase.DescriptionSnapshot,
            ProposalSubmitCreditsAdded = purchase.ProposalSubmitCreditsAdded,
            PricePaid = purchase.PricePaid,
            Currency = purchase.Currency,
            Status = purchase.Status,
            TransactionReferenceId = purchase.TransactionReferenceId,
            PurchasedAt = purchase.PurchasedAt
        };
    }

    private static string BuildAuditValue(ProposalCreditPackage package)
    {
        return $"PackageName={package.PackageName}; " +
               $"ProposalSubmitCredits={package.ProposalSubmitCredits}; " +
               $"Price={package.Price}; " +
               $"Currency={package.Currency}; " +
               $"IsActive={package.IsActive}; " +
               $"DisplayOrder={package.DisplayOrder}";
    }
}