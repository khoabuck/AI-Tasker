using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Dashboards
{
    public class AdminDashboardService : IAdminDashboardService
    {
        private readonly AITaskerDbContext _context;

        public AdminDashboardService(AITaskerDbContext context)
        {
            _context = context;
        }

        public async Task<AdminDashboardSummaryResponse> GetSummaryAsync()
        {
            var users = await _context.Users
                .AsNoTracking()
                .ToListAsync();

            var clientProfiles = await _context.ClientProfiles
                .AsNoTracking()
                .ToListAsync();

            var expertProfiles = await _context.ExpertProfiles
                .AsNoTracking()
                .ToListAsync();

            var jobs = await _context.JobPostings
                .AsNoTracking()
                .ToListAsync();

            var proposals = await _context.Proposals
                .AsNoTracking()
                .ToListAsync();

            var contracts = await _context.ProjectContracts
                .AsNoTracking()
                .ToListAsync();

            var projects = await _context.Projects
                .AsNoTracking()
                .ToListAsync();

            var milestones = await _context.Milestones
                .AsNoTracking()
                .ToListAsync();

            var disputes = await _context.Disputes
                .AsNoTracking()
                .ToListAsync();

            var reviews = await _context.Reviews
                .AsNoTracking()
                .ToListAsync();

            var wallets = await _context.Wallets
                .AsNoTracking()
                .ToListAsync();

            var transactions = await _context.Transactions
                .AsNoTracking()
                .ToListAsync();

            var escrows = await _context.Escrows
                .AsNoTracking()
                .ToListAsync();

            var withdrawalRequests = await _context.WithdrawalRequests
                .AsNoTracking()
                .ToListAsync();

            var nonDraftContracts = contracts
                .Where(c => !IsStatus(c.Status, "DRAFT"))
                .ToList();

            return new AdminDashboardSummaryResponse
            {
                GeneratedAt = DateTime.UtcNow,

                TotalUsers = users.Count,
                ActiveUsers = users.Count(u => IsStatus(u.Status, "ACTIVE")),
                PendingRoleUsers = users.Count(u => IsStatus(u.Status, "PENDING_ROLE")),

                TotalClients = clientProfiles.Count,
                IndividualClients = clientProfiles.Count(c => IsStatus(c.ClientType, "INDIVIDUAL")),
                BusinessClients = clientProfiles.Count(c => IsStatus(c.ClientType, "BUSINESS")),

                TotalExperts = expertProfiles.Count,
                ApprovedExperts = expertProfiles.Count(e => IsStatus(e.ProfileReviewStatus, "APPROVED")),
                PendingExperts = expertProfiles.Count(e =>
                    IsStatus(e.ProfileReviewStatus, "PENDING") ||
                    IsStatus(e.ProfileReviewStatus, "UNDER_REVIEW")),
                AvailableExperts = expertProfiles.Count(e => e.AvailableForWork),

                TotalJobs = jobs.Count,
                OpenJobs = jobs.Count(j => IsStatus(j.Status, "OPEN")),
                DraftJobs = jobs.Count(j => IsStatus(j.Status, "DRAFT")),
                ActiveJobs = jobs.Count(j => IsStatus(j.Status, "ACTIVE")),
                CompletedJobs = jobs.Count(j => IsStatus(j.Status, "COMPLETED")),
                DisputedJobs = jobs.Count(j => IsStatus(j.Status, "DISPUTED")),
                CancelledJobs = jobs.Count(j => IsStatus(j.Status, "CANCELLED")),

                TotalProposals = proposals.Count,
                SubmittedProposals = proposals.Count(p => IsStatus(p.Status, "SUBMITTED")),
                AcceptedProposals = proposals.Count(p => IsStatus(p.Status, "ACCEPTED")),
                RejectedProposals = proposals.Count(p => IsStatus(p.Status, "REJECTED")),
                WithdrawnProposals = proposals.Count(p => IsStatus(p.Status, "WITHDRAWN")),

                TotalContracts = contracts.Count,
                DraftContracts = contracts.Count(c => IsStatus(c.Status, "DRAFT")),
                ConfirmedContracts = contracts.Count(c => IsStatus(c.Status, "CONFIRMED")),

                TotalProjects = projects.Count,
                PendingEscrowProjects = projects.Count(p => IsStatus(p.Status, "PENDING_ESCROW")),
                ActiveProjects = projects.Count(p => IsStatus(p.Status, "ACTIVE")),
                DisputedProjects = projects.Count(p => IsStatus(p.Status, "DISPUTED")),
                CompletedProjects = projects.Count(p => IsStatus(p.Status, "COMPLETED")),

                TotalMilestones = milestones.Count,
                PendingMilestones = milestones.Count(m => IsStatus(m.Status, "PENDING")),
                FundedMilestones = milestones.Count(m => IsStatus(m.Status, "FUNDED")),
                SubmittedMilestones = milestones.Count(m => IsStatus(m.Status, "SUBMITTED")),
                ApprovedMilestones = milestones.Count(m =>
                    IsStatus(m.Status, "APPROVED") ||
                    IsStatus(m.Status, "RELEASED") ||
                    IsStatus(m.Status, "RESOLVED") ||
                    IsStatus(m.Status, "DISPUTE_RESOLVED")),
                DisputedMilestones = milestones.Count(m => IsStatus(m.Status, "DISPUTED")),

                TotalDisputes = disputes.Count,
                OpenDisputes = disputes.Count(d => IsStatus(d.Status, "OPEN")),
                ResolvedDisputes = disputes.Count(d => IsStatus(d.Status, "RESOLVED")),

                TotalReviews = reviews.Count,

                TotalWalletAvailableBalance = wallets.Sum(w => w.AvailableBalance),
                TotalWalletLockedBalance = wallets.Sum(w => w.LockedBalance),
                TotalExpertPendingEarningsBalance = wallets.Sum(w => w.PendingEarningsBalance),
                TotalExpertEarnings = wallets.Sum(w => w.TotalEarning),

                TotalContractValue = nonDraftContracts.Sum(c => c.FinalPrice),
                TotalClientPaymentExpected = nonDraftContracts.Sum(c => c.TotalClientPayment),
                PlatformFeeExpected = nonDraftContracts.Sum(c => c.PlatformFeeAmount),
                PlatformFeeCollected = SumAbsTransactionsByType(
                    transactions,
                    "PLATFORM_FEE"),

                EscrowLockedAmount = escrows
                    .Where(e => IsStatus(e.Status, "LOCKED"))
                    .Sum(e => e.Amount),

                EscrowFrozenAmount = escrows
                    .Where(e => IsStatus(e.Status, "FROZEN"))
                    .Sum(e => e.Amount),

                EscrowReleasedAmount = escrows
                    .Where(e => IsStatus(e.Status, "RELEASED"))
                    .Sum(e => e.Amount),

                EscrowRefundedAmount = escrows
                    .Where(e => IsStatus(e.Status, "REFUNDED"))
                    .Sum(e => e.Amount),

                PendingWithdrawalCount = withdrawalRequests
                    .Count(w => IsStatus(w.Status, "PENDING")),

                PendingWithdrawalAmount = withdrawalRequests
                    .Where(w => IsStatus(w.Status, "PENDING"))
                    .Sum(w => w.Amount)
            };
        }

        public async Task<AdminRevenueResponse> GetRevenueAsync()
        {
            var contracts = await _context.ProjectContracts
                .AsNoTracking()
                .ToListAsync();

            var escrows = await _context.Escrows
                .AsNoTracking()
                .ToListAsync();

            var transactions = await _context.Transactions
                .AsNoTracking()
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var withdrawalRequests = await _context.WithdrawalRequests
                .AsNoTracking()
                .ToListAsync();

            var nonDraftContracts = contracts
                .Where(c => !IsStatus(c.Status, "DRAFT"))
                .ToList();

            return new AdminRevenueResponse
            {
                GeneratedAt = DateTime.UtcNow,

                TotalContractValue = nonDraftContracts.Sum(c => c.FinalPrice),
                TotalClientPaymentExpected = nonDraftContracts.Sum(c => c.TotalClientPayment),
                PlatformFeeExpected = nonDraftContracts.Sum(c => c.PlatformFeeAmount),

                PlatformFeeCollected = SumAbsTransactionsByType(
                    transactions,
                    "PLATFORM_FEE"),

                TotalEscrowLocked = escrows
                    .Where(e => IsStatus(e.Status, "LOCKED"))
                    .Sum(e => e.Amount),

                TotalEscrowFrozen = escrows
                    .Where(e => IsStatus(e.Status, "FROZEN"))
                    .Sum(e => e.Amount),

                TotalEscrowReleased = escrows
                    .Where(e => IsStatus(e.Status, "RELEASED"))
                    .Sum(e => e.Amount),

                TotalEscrowRefunded = escrows
                    .Where(e => IsStatus(e.Status, "REFUNDED"))
                    .Sum(e => e.Amount),

                TotalExpertPayout = SumAbsTransactionsByType(
                    transactions,
                    "ESCROW_RECEIVE",
                    "ESCROW_RECEIVED",
                    "DISPUTE_ESCROW_RECEIVED"),

                TotalClientRefund = SumAbsTransactionsByType(
                    transactions,
                    "REFUND",
                    "ESCROW_REFUNDED",
                    "DISPUTE_REFUND"),

                PendingWithdrawalAmount = withdrawalRequests
                    .Where(w => IsStatus(w.Status, "PENDING"))
                    .Sum(w => w.Amount),

                PaidWithdrawalAmount = withdrawalRequests
                    .Where(w => IsStatus(w.Status, "PAID"))
                    .Sum(w => w.Amount),

                RecentTransactions = transactions
                    .Take(20)
                    .Select(MapTransaction)
                    .ToList()
            };
        }

        public async Task<IReadOnlyList<AdminProjectDashboardItemResponse>> GetProjectsAsync()
        {
            var projects = await _context.Projects
                .AsNoTracking()
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var contracts = await _context.ProjectContracts
                .AsNoTracking()
                .ToDictionaryAsync(c => c.ContractId);

            var proposals = await _context.Proposals
                .AsNoTracking()
                .ToDictionaryAsync(p => p.ProposalId);

            var jobs = await _context.JobPostings
                .AsNoTracking()
                .ToDictionaryAsync(j => j.JobPostingId);

            var clientProfiles = await _context.ClientProfiles
                .AsNoTracking()
                .ToDictionaryAsync(c => c.ClientProfileId);

            var expertProfiles = await _context.ExpertProfiles
                .AsNoTracking()
                .ToDictionaryAsync(e => e.ExpertProfileId);

            var users = await _context.Users
                .AsNoTracking()
                .ToDictionaryAsync(u => u.UserId);

            var milestones = await _context.Milestones
                .AsNoTracking()
                .ToListAsync();

            var escrows = await _context.Escrows
                .AsNoTracking()
                .ToListAsync();

            var result = new List<AdminProjectDashboardItemResponse>();

            foreach (var project in projects)
            {
                contracts.TryGetValue(project.ContractId, out var contract);

                Proposal? proposal = null;
                JobPosting? job = null;
                ClientProfile? clientProfile = null;
                ExpertProfile? expertProfile = null;
                User? clientUser = null;
                User? expertUser = null;

                if (contract != null)
                {
                    proposals.TryGetValue(contract.ProposalId, out proposal);

                    clientProfiles.TryGetValue(contract.ClientId, out clientProfile);
                    expertProfiles.TryGetValue(contract.ExpertId, out expertProfile);

                    if (proposal != null)
                    {
                        jobs.TryGetValue(proposal.JobId, out job);
                    }

                    if (clientProfile != null)
                    {
                        users.TryGetValue(clientProfile.UserId, out clientUser);
                    }

                    if (expertProfile != null)
                    {
                        users.TryGetValue(expertProfile.UserId, out expertUser);
                    }
                }

                var projectMilestones = milestones
                    .Where(m => m.ProjectId == project.ProjectId)
                    .ToList();

                var projectEscrows = escrows
                    .Where(e => e.ProjectId == project.ProjectId)
                    .ToList();

                result.Add(new AdminProjectDashboardItemResponse
                {
                    ProjectId = project.ProjectId,
                    ContractId = project.ContractId,
                    ProposalId = proposal?.ProposalId ?? 0,
                    JobId = job?.JobPostingId ?? 0,

                    ProjectTitle = project.Title,
                    JobTitle = job?.Title ?? string.Empty,
                    ProjectStatus = project.Status,
                    ContractStatus = contract?.Status ?? string.Empty,

                    ClientProfileId = clientProfile?.ClientProfileId ?? 0,
                    ClientUserId = clientProfile?.UserId ?? 0,
                    ClientName = clientUser?.FullName ?? string.Empty,

                    ExpertProfileId = expertProfile?.ExpertProfileId ?? 0,
                    ExpertUserId = expertProfile?.UserId ?? 0,
                    ExpertName = expertUser?.FullName ?? string.Empty,

                    ProjectTotalBudget = project.TotalBudget,
                    ContractFinalPrice = contract?.FinalPrice ?? 0,
                    PlatformFeeAmount = contract?.PlatformFeeAmount ?? 0,
                    TotalClientPayment = contract?.TotalClientPayment ?? 0,

                    MilestoneCount = projectMilestones.Count,
                    PendingMilestoneCount = projectMilestones.Count(m => IsStatus(m.Status, "PENDING")),
                    FundedMilestoneCount = projectMilestones.Count(m => IsStatus(m.Status, "FUNDED")),
                    SubmittedMilestoneCount = projectMilestones.Count(m => IsStatus(m.Status, "SUBMITTED")),
                    ApprovedMilestoneCount = projectMilestones.Count(m =>
                        IsStatus(m.Status, "APPROVED") ||
                        IsStatus(m.Status, "RELEASED") ||
                        IsStatus(m.Status, "RESOLVED") ||
                        IsStatus(m.Status, "DISPUTE_RESOLVED")),
                    DisputedMilestoneCount = projectMilestones.Count(m => IsStatus(m.Status, "DISPUTED")),

                    EscrowLockedAmount = projectEscrows
                        .Where(e => IsStatus(e.Status, "LOCKED"))
                        .Sum(e => e.Amount),

                    EscrowFrozenAmount = projectEscrows
                        .Where(e => IsStatus(e.Status, "FROZEN"))
                        .Sum(e => e.Amount),

                    EscrowReleasedAmount = projectEscrows
                        .Where(e => IsStatus(e.Status, "RELEASED"))
                        .Sum(e => e.Amount),

                    EscrowRefundedAmount = projectEscrows
                        .Where(e => IsStatus(e.Status, "REFUNDED"))
                        .Sum(e => e.Amount),

                    CreatedAt = project.CreatedAt,
                    StartDate = project.StartDate,
                    EndDate = project.EndDate
                });
            }

            return result;
        }

        public async Task<AdminFinanceOverviewResponse> GetFinanceOverviewAsync()
        {
            var platformWallet = await _context.PlatformWallets
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.WalletCode == "MAIN");

            var wallets = await _context.Wallets
                .AsNoTracking()
                .ToListAsync();

            var escrows = await _context.Escrows
                .AsNoTracking()
                .ToListAsync();

            var withdrawalRequests = await _context.WithdrawalRequests
                .AsNoTracking()
                .ToListAsync();

            var aiUsageLogs = await _context.AIUsageLogs
                .AsNoTracking()
                .ToListAsync();

            var platformTotalRevenue = platformWallet?.TotalRevenue ?? 0;
            var estimatedAiCostVnd = aiUsageLogs.Sum(x => x.EstimatedTotalCostVnd);
            var actualAiCostVnd = aiUsageLogs.Sum(x => x.ActualTotalCostVnd);

            return new AdminFinanceOverviewResponse
            {
                GeneratedAt = DateTime.UtcNow,

                PlatformAvailableBalance = platformWallet?.AvailableBalance ?? 0,
                PlatformTotalRevenue = platformTotalRevenue,
                PlatformFeeRevenue = platformWallet?.PlatformFeeRevenue ?? 0,
                WithdrawalFeeRevenue = platformWallet?.WithdrawalFeeRevenue ?? 0,
                AdjustmentBalance = platformWallet?.AdjustmentBalance ?? 0,

                TotalAIRequests = aiUsageLogs.Count,
                TotalAITokens = aiUsageLogs.Sum(x => (long)x.TotalTokens),
                EstimatedAICostUsd = aiUsageLogs.Sum(x => x.EstimatedTotalCostUsd),
                EstimatedAICostVnd = estimatedAiCostVnd,
                ActualAICostUsd = aiUsageLogs.Sum(x => x.ActualTotalCostUsd),
                ActualAICostVnd = actualAiCostVnd,
                FreeTierAISavingsVnd = aiUsageLogs.Sum(x => x.FreeTierSavingsVnd),
                EstimatedNetPlatformProfitVnd = platformTotalRevenue - estimatedAiCostVnd,
                ActualNetPlatformProfitVnd = platformTotalRevenue - actualAiCostVnd,

                TotalUserAvailableBalance = wallets.Sum(x => x.AvailableBalance),
                TotalUserLockedBalance = wallets.Sum(x => x.LockedBalance),
                TotalExpertPendingEarningsBalance = wallets.Sum(x => x.PendingEarningsBalance),
                TotalExpertEarnings = wallets.Sum(x => x.TotalEarning),

                TotalEscrowLocked = escrows
                    .Where(x => IsStatus(x.Status, "LOCKED"))
                    .Sum(x => x.Amount),

                TotalEscrowFrozen = escrows
                    .Where(x => IsStatus(x.Status, "FROZEN"))
                    .Sum(x => x.Amount),

                TotalEscrowReleased = escrows
                    .Where(x => IsStatus(x.Status, "RELEASED"))
                    .Sum(x => x.Amount),

                TotalEscrowRefunded = escrows
                    .Where(x => IsStatus(x.Status, "REFUNDED"))
                    .Sum(x => x.Amount),

                PendingWithdrawalCount = withdrawalRequests
                    .Count(x => IsStatus(x.Status, "PENDING")),

                PendingWithdrawalAmount = withdrawalRequests
                    .Where(x => IsStatus(x.Status, "PENDING"))
                    .Sum(x => x.Amount),

                PaidWithdrawalCount = withdrawalRequests
                    .Count(x => IsStatus(x.Status, "PAID")),

                PaidWithdrawalAmount = withdrawalRequests
                    .Where(x => IsStatus(x.Status, "PAID"))
                    .Sum(x => x.Amount),

                RejectedWithdrawalCount = withdrawalRequests
                    .Count(x => IsStatus(x.Status, "REJECTED")),

                RejectedWithdrawalAmount = withdrawalRequests
                    .Where(x => IsStatus(x.Status, "REJECTED"))
                    .Sum(x => x.Amount),

                FailedWithdrawalCount = withdrawalRequests
                    .Count(x => IsStatus(x.Status, "FAILED")),

                FailedWithdrawalAmount = withdrawalRequests
                    .Where(x => IsStatus(x.Status, "FAILED"))
                    .Sum(x => x.Amount)
            };
        }

        public async Task<PlatformWalletResponse> GetPlatformWalletAsync()
        {
            var wallet = await _context.PlatformWallets
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.WalletCode == "MAIN");

            if (wallet == null)
            {
                return new PlatformWalletResponse
                {
                    PlatformWalletId = 0,
                    WalletCode = "MAIN",
                    AvailableBalance = 0,
                    TotalRevenue = 0,
                    PlatformFeeRevenue = 0,
                    WithdrawalFeeRevenue = 0,
                    AdjustmentBalance = 0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
            }

            return new PlatformWalletResponse
            {
                PlatformWalletId = wallet.PlatformWalletId,
                WalletCode = wallet.WalletCode,
                AvailableBalance = wallet.AvailableBalance,
                TotalRevenue = wallet.TotalRevenue,
                PlatformFeeRevenue = wallet.PlatformFeeRevenue,
                WithdrawalFeeRevenue = wallet.WithdrawalFeeRevenue,
                AdjustmentBalance = wallet.AdjustmentBalance,
                CreatedAt = wallet.CreatedAt,
                UpdatedAt = wallet.UpdatedAt
            };
        }

        public async Task<IReadOnlyList<PlatformTransactionResponse>> GetPlatformTransactionsAsync(
            string? type = null,
            int take = 100)
        {
            take = NormalizeTake(take);

            var query = _context.PlatformTransactions
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAt)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(type))
            {
                var normalizedType = type.Trim().ToUpperInvariant();
                query = query.Where(x => x.Type == normalizedType);
            }

            var transactions = await query
                .Take(take)
                .ToListAsync();

            return transactions
                .Select(x => new PlatformTransactionResponse
                {
                    PlatformTransactionId = x.PlatformTransactionId,
                    PlatformWalletId = x.PlatformWalletId,
                    ProjectId = x.ProjectId,
                    ContractId = x.ContractId,
                    WithdrawalRequestId = x.WithdrawalRequestId,
                    UserId = x.UserId,
                    Type = x.Type,
                    Amount = x.Amount,
                    Status = x.Status,
                    Description = x.Description,
                    ReferenceId = x.ReferenceId,
                    CreatedAt = x.CreatedAt
                })
                .ToList();
        }

        public async Task<IReadOnlyList<AdminUserWalletResponse>> GetUserWalletsAsync(
            string? role = null,
            int take = 100)
        {
            take = NormalizeTake(take);

            var query =
                from wallet in _context.Wallets.AsNoTracking()
                join user in _context.Users.AsNoTracking()
                    on wallet.UserId equals user.UserId
                select new
                {
                    Wallet = wallet,
                    User = user
                };

            if (!string.IsNullOrWhiteSpace(role))
            {
                var normalizedRole = role.Trim().ToUpperInvariant();
                query = query.Where(x => x.User.Role == normalizedRole);
            }

            var rows = await query
                .OrderByDescending(x => x.Wallet.UpdatedAt)
                .Take(take)
                .ToListAsync();

            return rows
                .Select(x => new AdminUserWalletResponse
                {
                    WalletId = x.Wallet.WalletId,
                    UserId = x.User.UserId,
                    Email = x.User.Email,
                    FullName = x.User.FullName,
                    Role = x.User.Role,
                    UserStatus = x.User.Status,
                    AvailableBalance = x.Wallet.AvailableBalance,
                    LockedBalance = x.Wallet.LockedBalance,
                    PendingEarningsBalance = x.Wallet.PendingEarningsBalance,
                    WithdrawableBalance = x.Wallet.AvailableBalance,
                    TotalEarning = x.Wallet.TotalEarning,
                    UpdatedAt = x.Wallet.UpdatedAt
                })
                .ToList();
        }

        public async Task<IReadOnlyList<AdminRevenueTransactionItemResponse>> GetTransactionsAsync(
            string? type = null,
            int take = 100)
        {
            take = NormalizeTake(take);

            var query = _context.Transactions
                .AsNoTracking()
                .OrderByDescending(x => x.CreatedAt)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(type))
            {
                var normalizedType = type.Trim().ToUpperInvariant();
                query = query.Where(x => x.Type == normalizedType);
            }

            var transactions = await query
                .Take(take)
                .ToListAsync();

            return transactions
                .Select(MapTransaction)
                .ToList();
        }

        public async Task<IReadOnlyList<AdminEscrowFinanceItemResponse>> GetEscrowsAsync(
            string? status = null,
            int take = 100)
        {
            take = NormalizeTake(take);

            var query =
                from escrow in _context.Escrows.AsNoTracking()
                join project in _context.Projects.AsNoTracking()
                    on escrow.ProjectId equals project.ProjectId
                join clientProfile in _context.ClientProfiles.AsNoTracking()
                    on escrow.ClientProfileId equals clientProfile.ClientProfileId
                join clientUser in _context.Users.AsNoTracking()
                    on clientProfile.UserId equals clientUser.UserId
                join milestone in _context.Milestones.AsNoTracking()
                    on escrow.MilestoneId equals milestone.MilestoneId into milestoneJoin
                from milestone in milestoneJoin.DefaultIfEmpty()
                select new
                {
                    Escrow = escrow,
                    Project = project,
                    ClientUser = clientUser,
                    Milestone = milestone
                };

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToUpperInvariant();
                query = query.Where(x => x.Escrow.Status == normalizedStatus);
            }

            var rows = await query
                .OrderByDescending(x => x.Escrow.CreatedAt)
                .Take(take)
                .ToListAsync();

            return rows
                .Select(x => new AdminEscrowFinanceItemResponse
                {
                    EscrowId = x.Escrow.EscrowId,
                    ProjectId = x.Escrow.ProjectId,
                    MilestoneId = x.Escrow.MilestoneId,
                    ClientProfileId = x.Escrow.ClientProfileId,
                    ProjectTitle = x.Project.Title,
                    MilestoneTitle = x.Milestone?.Title,
                    ClientName = x.ClientUser.FullName,
                    Amount = x.Escrow.Amount,
                    Status = x.Escrow.Status,
                    CreatedAt = x.Escrow.CreatedAt,
                    UpdatedAt = x.Escrow.UpdatedAt
                })
                .ToList();
        }

        private static AdminRevenueTransactionItemResponse MapTransaction(
            Transaction transaction)
        {
            return new AdminRevenueTransactionItemResponse
            {
                TransactionId = transaction.TransactionId,
                UserId = transaction.UserId,
                ProjectId = transaction.ProjectId,
                MilestoneId = transaction.MilestoneId,
                EscrowId = transaction.EscrowId,
                Type = transaction.Type,
                Amount = transaction.Amount,
                Status = transaction.Status,
                Description = transaction.Description,
                ReferenceId = transaction.ReferenceId,
                CreatedAt = transaction.CreatedAt
            };
        }

        private static decimal SumAbsTransactionsByType(
            IEnumerable<Transaction> transactions,
            params string[] types)
        {
            var normalizedTypes = types
                .Select(Normalize)
                .ToHashSet();

            return transactions
                .Where(t => normalizedTypes.Contains(Normalize(t.Type)))
                .Sum(t => Math.Abs(t.Amount));
        }

        private static int NormalizeTake(int take)
        {
            if (take <= 0)
            {
                return 100;
            }

            return Math.Min(take, 500);
        }

        private static bool IsStatus(
            string? value,
            string expected)
        {
            return Normalize(value) == Normalize(expected);
        }

        private static string Normalize(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : value.Trim().ToUpperInvariant();
        }
    }
}