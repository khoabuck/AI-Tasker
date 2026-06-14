using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Banking
{
    public class WalletService : IWalletService
    {
        private const string ProjectStatusPendingEscrow = "PENDING_ESCROW";
        private const string ProjectStatusActive = "ACTIVE";

        private const string MilestoneStatusPending = "PENDING";
        private const string MilestoneStatusFunded = "FUNDED";
        private const string MilestoneStatusApproved = "APPROVED";
        private const string MilestoneStatusDisputed = "DISPUTED";

        private const string PaymentStatusPending = "PENDING";
        private const string PaymentStatusLocked = "LOCKED";
        private const string PaymentStatusReleased = "RELEASED";
        private const string PaymentStatusRefunded = "REFUNDED";
        private const string PaymentStatusFrozen = "FROZEN";

        private const string EscrowStatusPending = "PENDING";
        private const string EscrowStatusLocked = "LOCKED";
        private const string EscrowStatusReleased = "RELEASED";
        private const string EscrowStatusRefunded = "REFUNDED";
        private const string EscrowStatusFrozen = "FROZEN";

        private const string TransactionStatusSuccess = "SUCCESS";

        private const string TxDeposit = "DEPOSIT";
        private const string TxWithdraw = "WITHDRAW";
        private const string TxEscrowLock = "ESCROW_LOCK";
        private const string TxEscrowRelease = "ESCROW_RELEASE";
        private const string TxEscrowReceive = "ESCROW_RECEIVE";
        private const string TxRefund = "REFUND";
        private const string TxPlatformFee = "PLATFORM_FEE";
        private const string TxEscrowFreeze = "ESCROW_FREEZE";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public WalletService(
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        private async Task<Wallet> GetOrCreateWalletAsync(int userId)
        {
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet == null)
            {
                var userExists = await _context.Users
                    .AnyAsync(u => u.UserId == userId);

                if (!userExists)
                {
                    throw new InvalidOperationException("User not found.");
                }

                wallet = new Wallet
                {
                    UserId = userId,
                    AvailableBalance = 0m,
                    LockedBalance = 0m,
                    TotalEarning = 0m,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Wallets.Add(wallet);
                await _context.SaveChangesAsync();
            }

            return wallet;
        }

        public async Task<Wallet> GetWalletByUserIdAsync(int userId)
        {
            return await GetOrCreateWalletAsync(userId);
        }

        public async Task<decimal> GetBalanceAsync(int userId)
        {
            var wallet = await GetOrCreateWalletAsync(userId);
            return wallet.AvailableBalance;
        }

        public async Task<WalletResponse> GetMyWalletAsync(int userId)
        {
            var wallet = await GetOrCreateWalletAsync(userId);
            return MapWallet(wallet);
        }

        public async Task<IReadOnlyList<TransactionResponse>> GetMyTransactionsAsync(int userId)
        {
            var transactions = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            return transactions
                .Select(MapTransaction)
                .ToList();
        }

        public async Task<IReadOnlyList<EscrowResponse>> GetProjectEscrowsAsync(
            int currentUserId,
            int projectId)
        {
            var project = await GetProjectAsync(projectId);
            await EnsureUserCanAccessProjectAsync(currentUserId, project);

            var escrows = await _context.Escrows
                .AsNoTracking()
                .Where(e => e.ProjectId == projectId)
                .OrderBy(e => e.MilestoneId)
                .ThenBy(e => e.EscrowId)
                .ToListAsync();

            var responses = new List<EscrowResponse>();

            foreach (var escrow in escrows)
            {
                responses.Add(await MapEscrowAsync(escrow));
            }

            return responses;
        }

        public async Task<bool> DepositAsync(
            int userId,
            decimal amount,
            string transactionRef)
        {
            return await DepositAsync(
                userId,
                amount,
                $"[Deposit] Wallet deposit with reference {transactionRef}",
                transactionRef);
        }

        public async Task<bool> DepositAsync(
            int userId,
            decimal amount,
            string description,
            string referenceId)
        {
            if (amount <= 0)
            {
                return false;
            }

            var userExists = await _context.Users
                .AnyAsync(u => u.UserId == userId);

            if (!userExists)
            {
                return false;
            }

            var alreadyExists = await _context.Transactions.AnyAsync(t =>
                t.UserId == userId &&
                t.ReferenceId == referenceId &&
                t.Type == TxDeposit &&
                t.Status == TransactionStatusSuccess);

            if (alreadyExists)
            {
                return true;
            }

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var wallet = await GetOrCreateWalletAsync(userId);

                wallet.AvailableBalance += amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                _context.Transactions.Add(new Transaction
                {
                    UserId = userId,
                    ProjectId = null,
                    MilestoneId = null,
                    EscrowId = null,
                    Amount = amount,
                    Type = TxDeposit,
                    Status = TransactionStatusSuccess,
                    Description = description,
                    ReferenceId = referenceId,
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                return false;
            }
        }

        public async Task<bool> WithdrawAsync(
            int userId,
            decimal amount,
            string description)
        {
            if (amount <= 0)
            {
                return false;
            }

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var wallet = await _context.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == userId);

                if (wallet == null || wallet.AvailableBalance < amount)
                {
                    return false;
                }

                wallet.AvailableBalance -= amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                _context.Transactions.Add(new Transaction
                {
                    UserId = userId,
                    ProjectId = null,
                    MilestoneId = null,
                    EscrowId = null,
                    Amount = -amount,
                    Type = TxWithdraw,
                    Status = TransactionStatusSuccess,
                    Description = description,
                    ReferenceId = "INTERNAL",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                return true;
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                return false;
            }
        }

        public async Task<EscrowOperationResponse> LockProjectEscrowAsync(
            int currentUserId,
            int projectId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var project = await GetProjectAsync(projectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

                if (clientProfile.UserId != currentUserId)
                {
                    throw new UnauthorizedAccessException("Only the project Client can lock escrow.");
                }

                if (!string.Equals(project.Status, ProjectStatusPendingEscrow, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Project must be PENDING_ESCROW before locking escrow.");
                }

                var milestones = await _context.Milestones
                    .Where(m => m.ProjectId == project.ProjectId)
                    .OrderBy(m => m.OrderIndex)
                    .ThenBy(m => m.MilestoneId)
                    .ToListAsync();

                if (!milestones.Any())
                {
                    throw new InvalidOperationException("Project must have at least one milestone before locking escrow.");
                }

                var milestoneTotal = milestones.Sum(m => m.Amount);

                if (milestoneTotal != contract.FinalPrice)
                {
                    throw new InvalidOperationException(
                        $"Milestone total amount ({milestoneTotal}) must equal contract final price ({contract.FinalPrice}).");
                }

                var existingLockedEscrows = await _context.Escrows
                    .Where(e =>
                        e.ProjectId == project.ProjectId &&
                        e.Status == EscrowStatusLocked)
                    .ToListAsync();

                if (existingLockedEscrows.Count == milestones.Count)
                {
                    return await BuildProjectEscrowResponseAsync(
                        project,
                        null,
                        "Project escrow is already locked.");
                }

                if (existingLockedEscrows.Any())
                {
                    throw new InvalidOperationException("Project escrow is partially locked. Please check escrow records.");
                }

                var clientWallet = await GetOrCreateWalletAsync(clientProfile.UserId);

                if (clientWallet.AvailableBalance < contract.TotalClientPayment)
                {
                    throw new InvalidOperationException("Client wallet balance is not enough to lock escrow.");
                }

                clientWallet.AvailableBalance -= contract.TotalClientPayment;
                clientWallet.LockedBalance += contract.FinalPrice;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                foreach (var milestone in milestones)
                {
                    var escrow = new Escrow
                    {
                        ProjectId = project.ProjectId,
                        MilestoneId = milestone.MilestoneId,
                        ClientProfileId = clientProfile.ClientProfileId,
                        Amount = milestone.Amount,
                        Status = EscrowStatusLocked,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Escrows.Add(escrow);

                    milestone.Status = MilestoneStatusFunded;
                    milestone.PaymentStatus = PaymentStatusLocked;
                }

                project.Status = ProjectStatusActive;
                project.StartDate ??= DateTime.UtcNow;

                _context.Transactions.Add(new Transaction
                {
                    UserId = clientProfile.UserId,
                    ProjectId = project.ProjectId,
                    MilestoneId = null,
                    EscrowId = null,
                    Amount = -contract.FinalPrice,
                    Type = TxEscrowLock,
                    Status = TransactionStatusSuccess,
                    Description = $"[Escrow Lock] Locked project amount for Project ID {project.ProjectId}",
                    ReferenceId = $"PROJECT_{project.ProjectId}",
                    CreatedAt = DateTime.UtcNow
                });

                if (contract.PlatformFeeAmount > 0)
                {
                    _context.Transactions.Add(new Transaction
                    {
                        UserId = clientProfile.UserId,
                        ProjectId = project.ProjectId,
                        MilestoneId = null,
                        EscrowId = null,
                        Amount = -contract.PlatformFeeAmount,
                        Type = TxPlatformFee,
                        Status = TransactionStatusSuccess,
                        Description = $"[Platform Fee] Platform fee for Project ID {project.ProjectId}",
                        ReferenceId = $"PROJECT_{project.ProjectId}_PLATFORM_FEE",
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Escrow locked",
                    $"Escrow has been locked for project: {project.Title}.",
                    "ESCROW_LOCKED");

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Project started",
                    $"Client locked escrow for project: {project.Title}. You can start working on milestones.",
                    "PROJECT_STARTED");

                return await BuildProjectEscrowResponseAsync(
                    project,
                    null,
                    "Project escrow locked successfully.");
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task<EscrowOperationResponse> HoldEscrowAsync(
            int currentUserId,
            int milestoneId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var milestone = await GetMilestoneAsync(milestoneId);
                var project = await GetProjectAsync(milestone.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

                if (clientProfile.UserId != currentUserId)
                {
                    throw new UnauthorizedAccessException("Only the project Client can lock milestone escrow.");
                }

                if (!string.Equals(project.Status, ProjectStatusPendingEscrow, StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(project.Status, ProjectStatusActive, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Project status does not allow milestone escrow lock.");
                }

                if (!string.Equals(milestone.Status, MilestoneStatusPending, StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(milestone.PaymentStatus, PaymentStatusPending, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Milestone must be pending before escrow lock.");
                }

                var existingEscrow = await _context.Escrows
                    .FirstOrDefaultAsync(e => e.MilestoneId == milestoneId);

                if (existingEscrow != null &&
                    string.Equals(existingEscrow.Status, EscrowStatusLocked, StringComparison.OrdinalIgnoreCase))
                {
                    return await BuildProjectEscrowResponseAsync(
                        project,
                        milestone,
                        "Milestone escrow is already locked.");
                }

                if (existingEscrow != null)
                {
                    throw new InvalidOperationException("Milestone already has an escrow record.");
                }

                var clientWallet = await GetOrCreateWalletAsync(clientProfile.UserId);

                if (clientWallet.AvailableBalance < milestone.Amount)
                {
                    throw new InvalidOperationException("Client wallet balance is not enough to lock milestone escrow.");
                }

                var escrow = new Escrow
                {
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    ClientProfileId = clientProfile.ClientProfileId,
                    Amount = milestone.Amount,
                    Status = EscrowStatusLocked,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Escrows.Add(escrow);

                clientWallet.AvailableBalance -= milestone.Amount;
                clientWallet.LockedBalance += milestone.Amount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                milestone.Status = MilestoneStatusFunded;
                milestone.PaymentStatus = PaymentStatusLocked;

                _context.Transactions.Add(new Transaction
                {
                    UserId = clientProfile.UserId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    EscrowId = null,
                    Amount = -milestone.Amount,
                    Type = TxEscrowLock,
                    Status = TransactionStatusSuccess,
                    Description = $"[Escrow Lock] Locked funds for Milestone ID {milestone.MilestoneId}",
                    ReferenceId = $"MILESTONE_{milestone.MilestoneId}",
                    CreatedAt = DateTime.UtcNow
                });

                var allMilestones = await _context.Milestones
                    .Where(m => m.ProjectId == project.ProjectId)
                    .ToListAsync();

                if (allMilestones.All(m =>
                        m.MilestoneId == milestone.MilestoneId ||
                        string.Equals(m.PaymentStatus, PaymentStatusLocked, StringComparison.OrdinalIgnoreCase)))
                {
                    project.Status = ProjectStatusActive;
                    project.StartDate ??= DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Milestone escrow locked",
                    $"Client locked escrow for milestone: {milestone.Title}.",
                    "MILESTONE_ESCROW_LOCKED");

                return await BuildProjectEscrowResponseAsync(
                    project,
                    milestone,
                    "Milestone escrow locked successfully.");
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task<EscrowOperationResponse> ReleaseEscrowAsync(
            int currentUserId,
            int milestoneId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var milestone = await GetMilestoneAsync(milestoneId);
                var project = await GetProjectAsync(milestone.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

                var user = await GetUserAsync(currentUserId);

                if (clientProfile.UserId != currentUserId &&
                    !string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
                {
                    throw new UnauthorizedAccessException("Only the project Client or Admin can release escrow.");
                }

                var escrow = await GetLockedEscrowByMilestoneAsync(milestoneId);

                var clientWallet = await GetOrCreateWalletAsync(clientProfile.UserId);
                var expertWallet = await GetOrCreateWalletAsync(expertProfile.UserId);

                if (clientWallet.LockedBalance < escrow.Amount)
                {
                    throw new InvalidOperationException("Client locked balance is not enough to release escrow.");
                }

                clientWallet.LockedBalance -= escrow.Amount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                expertWallet.AvailableBalance += escrow.Amount;
                expertWallet.TotalEarning += escrow.Amount;
                expertWallet.UpdatedAt = DateTime.UtcNow;

                escrow.Status = EscrowStatusReleased;
                escrow.UpdatedAt = DateTime.UtcNow;

                milestone.Status = MilestoneStatusApproved;
                milestone.PaymentStatus = PaymentStatusReleased;

                _context.Transactions.Add(new Transaction
                {
                    UserId = clientProfile.UserId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    EscrowId = escrow.EscrowId,
                    Amount = escrow.Amount,
                    Type = TxEscrowRelease,
                    Status = TransactionStatusSuccess,
                    Description = $"[Escrow Release] Released funds for Milestone ID {milestone.MilestoneId}",
                    ReferenceId = $"MILESTONE_{milestone.MilestoneId}",
                    CreatedAt = DateTime.UtcNow
                });

                _context.Transactions.Add(new Transaction
                {
                    UserId = expertProfile.UserId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    EscrowId = escrow.EscrowId,
                    Amount = escrow.Amount,
                    Type = TxEscrowReceive,
                    Status = TransactionStatusSuccess,
                    Description = $"[Escrow Receive] Received funds for Milestone ID {milestone.MilestoneId}",
                    ReferenceId = $"MILESTONE_{milestone.MilestoneId}",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Escrow released",
                    $"Escrow for milestone '{milestone.Title}' has been released to your wallet.",
                    "ESCROW_RELEASED");

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Escrow released",
                    $"Escrow for milestone '{milestone.Title}' has been released.",
                    "ESCROW_RELEASED");

                return await BuildProjectEscrowResponseAsync(
                    project,
                    milestone,
                    "Milestone escrow released successfully.");
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task<EscrowOperationResponse> RefundEscrowAsync(
            int currentUserId,
            int milestoneId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var milestone = await GetMilestoneAsync(milestoneId);
                var project = await GetProjectAsync(milestone.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

                var user = await GetUserAsync(currentUserId);

                if (clientProfile.UserId != currentUserId &&
                    !string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
                {
                    throw new UnauthorizedAccessException("Only the project Client or Admin can refund escrow.");
                }

                var escrow = await GetLockedOrFrozenEscrowByMilestoneAsync(milestoneId);

                var clientWallet = await GetOrCreateWalletAsync(clientProfile.UserId);

                if (clientWallet.LockedBalance < escrow.Amount)
                {
                    throw new InvalidOperationException("Client locked balance is not enough to refund escrow.");
                }

                clientWallet.LockedBalance -= escrow.Amount;
                clientWallet.AvailableBalance += escrow.Amount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                escrow.Status = EscrowStatusRefunded;
                escrow.UpdatedAt = DateTime.UtcNow;

                milestone.PaymentStatus = PaymentStatusRefunded;

                _context.Transactions.Add(new Transaction
                {
                    UserId = clientProfile.UserId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    EscrowId = escrow.EscrowId,
                    Amount = escrow.Amount,
                    Type = TxRefund,
                    Status = TransactionStatusSuccess,
                    Description = $"[Escrow Refund] Refunded funds for Milestone ID {milestone.MilestoneId}",
                    ReferenceId = $"MILESTONE_{milestone.MilestoneId}",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Escrow refunded",
                    $"Escrow for milestone '{milestone.Title}' has been refunded to your wallet.",
                    "ESCROW_REFUNDED");

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Escrow refunded",
                    $"Escrow for milestone '{milestone.Title}' has been refunded to the Client.",
                    "ESCROW_REFUNDED");

                return await BuildProjectEscrowResponseAsync(
                    project,
                    milestone,
                    "Milestone escrow refunded successfully.");
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task<EscrowOperationResponse> FreezeEscrowAsync(
            int currentUserId,
            int milestoneId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var milestone = await GetMilestoneAsync(milestoneId);
                var project = await GetProjectAsync(milestone.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

                var user = await GetUserAsync(currentUserId);

                var userBelongsToProject =
                    clientProfile.UserId == currentUserId ||
                    expertProfile.UserId == currentUserId;

                var userIsAdmin = string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase);

                if (!userBelongsToProject && !userIsAdmin)
                {
                    throw new UnauthorizedAccessException("Only project members or Admin can freeze escrow.");
                }

                var escrow = await GetLockedEscrowByMilestoneAsync(milestoneId);

                escrow.Status = EscrowStatusFrozen;
                escrow.UpdatedAt = DateTime.UtcNow;

                milestone.Status = MilestoneStatusDisputed;
                milestone.PaymentStatus = PaymentStatusFrozen;

                _context.Transactions.Add(new Transaction
                {
                    UserId = currentUserId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    EscrowId = escrow.EscrowId,
                    Amount = 0,
                    Type = TxEscrowFreeze,
                    Status = TransactionStatusSuccess,
                    Description = $"[Escrow Freeze] Frozen escrow for Milestone ID {milestone.MilestoneId}",
                    ReferenceId = $"MILESTONE_{milestone.MilestoneId}",
                    CreatedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Escrow frozen",
                    $"Escrow for milestone '{milestone.Title}' has been frozen due to dispute.",
                    "ESCROW_FROZEN");

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Escrow frozen",
                    $"Escrow for milestone '{milestone.Title}' has been frozen due to dispute.",
                    "ESCROW_FROZEN");

                return await BuildProjectEscrowResponseAsync(
                    project,
                    milestone,
                    "Milestone escrow frozen successfully.");
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ReleaseEscrowAsync(int milestoneId)
        {
            try
            {
                var milestone = await GetMilestoneAsync(milestoneId);
                var project = await GetProjectAsync(milestone.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);

                await ReleaseEscrowAsync(clientProfile.UserId, milestoneId);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> RefundEscrowAsync(int milestoneId)
        {
            try
            {
                var milestone = await GetMilestoneAsync(milestoneId);
                var project = await GetProjectAsync(milestone.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);

                await RefundEscrowAsync(clientProfile.UserId, milestoneId);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private async Task<EscrowOperationResponse> BuildProjectEscrowResponseAsync(
            Project project,
            Milestone? milestone,
            string message)
        {
            var contract = await GetContractAsync(project.ContractId);

            var escrows = await _context.Escrows
                .AsNoTracking()
                .Where(e => e.ProjectId == project.ProjectId)
                .OrderBy(e => e.MilestoneId)
                .ThenBy(e => e.EscrowId)
                .ToListAsync();

            var escrowResponses = new List<EscrowResponse>();

            foreach (var escrow in escrows)
            {
                escrowResponses.Add(await MapEscrowAsync(escrow));
            }

            return new EscrowOperationResponse
            {
                Success = true,
                Message = message,
                ProjectId = project.ProjectId,
                MilestoneId = milestone?.MilestoneId,
                Amount = milestone?.Amount ?? contract.FinalPrice,
                PlatformFeeAmount = milestone == null ? contract.PlatformFeeAmount : 0,
                TotalClientPayment = milestone == null ? contract.TotalClientPayment : milestone.Amount,
                ProjectStatus = project.Status,
                MilestoneStatus = milestone?.Status,
                MilestonePaymentStatus = milestone?.PaymentStatus,
                Escrows = escrowResponses
            };
        }

        private async Task<Escrow> GetLockedEscrowByMilestoneAsync(int milestoneId)
        {
            var escrow = await _context.Escrows
                .FirstOrDefaultAsync(e =>
                    e.MilestoneId == milestoneId &&
                    e.Status == EscrowStatusLocked);

            if (escrow == null)
            {
                throw new InvalidOperationException("Locked escrow not found for this milestone.");
            }

            return escrow;
        }

        private async Task<Escrow> GetLockedOrFrozenEscrowByMilestoneAsync(int milestoneId)
        {
            var escrow = await _context.Escrows
                .FirstOrDefaultAsync(e =>
                    e.MilestoneId == milestoneId &&
                    (e.Status == EscrowStatusLocked ||
                     e.Status == EscrowStatusFrozen));

            if (escrow == null)
            {
                throw new InvalidOperationException("Locked or frozen escrow not found for this milestone.");
            }

            return escrow;
        }

        private async Task EnsureUserCanAccessProjectAsync(
            int currentUserId,
            Project project)
        {
            var user = await GetUserAsync(currentUserId);

            if (string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var contract = await GetContractAsync(project.ContractId);
            var clientProfile = await GetClientProfileAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

            if (clientProfile.UserId == currentUserId ||
                expertProfile.UserId == currentUserId)
            {
                return;
            }

            throw new UnauthorizedAccessException("You do not have permission to access this project.");
        }

        private async Task<User> GetUserAsync(int userId)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                throw new InvalidOperationException("User not found.");
            }

            return user;
        }

        private async Task<Project> GetProjectAsync(int projectId)
        {
            var project = await _context.Projects
                .FirstOrDefaultAsync(p => p.ProjectId == projectId);

            if (project == null)
            {
                throw new InvalidOperationException("Project not found.");
            }

            return project;
        }

        private async Task<Milestone> GetMilestoneAsync(int milestoneId)
        {
            var milestone = await _context.Milestones
                .FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

            if (milestone == null)
            {
                throw new InvalidOperationException("Milestone not found.");
            }

            return milestone;
        }

        private async Task<ProjectContract> GetContractAsync(int contractId)
        {
            var contract = await _context.ProjectContracts
                .FirstOrDefaultAsync(c => c.ContractId == contractId);

            if (contract == null)
            {
                throw new InvalidOperationException("Contract not found.");
            }

            return contract;
        }

        private async Task<ClientProfile> GetClientProfileAsync(int clientProfileId)
        {
            var clientProfile = await _context.ClientProfiles
                .FirstOrDefaultAsync(c => c.ClientProfileId == clientProfileId);

            if (clientProfile == null)
            {
                throw new InvalidOperationException("Client profile not found.");
            }

            return clientProfile;
        }

        private async Task<ExpertProfile> GetExpertProfileAsync(int expertProfileId)
        {
            var expertProfile = await _context.ExpertProfiles
                .FirstOrDefaultAsync(e => e.ExpertProfileId == expertProfileId);

            if (expertProfile == null)
            {
                throw new InvalidOperationException("Expert profile not found.");
            }

            return expertProfile;
        }

        private static WalletResponse MapWallet(Wallet wallet)
        {
            return new WalletResponse
            {
                WalletId = wallet.WalletId,
                UserId = wallet.UserId,
                AvailableBalance = wallet.AvailableBalance,
                LockedBalance = wallet.LockedBalance,
                TotalEarning = wallet.TotalEarning,
                UpdatedAt = wallet.UpdatedAt
            };
        }

        private static TransactionResponse MapTransaction(Transaction transaction)
        {
            return new TransactionResponse
            {
                TransactionId = transaction.TransactionId,
                EscrowId = transaction.EscrowId,
                ProjectId = transaction.ProjectId,
                MilestoneId = transaction.MilestoneId,
                UserId = transaction.UserId,
                Type = transaction.Type,
                Amount = transaction.Amount,
                Status = transaction.Status,
                Description = transaction.Description,
                ReferenceId = transaction.ReferenceId,
                CreatedAt = transaction.CreatedAt
            };
        }

        private async Task<EscrowResponse> MapEscrowAsync(Escrow escrow)
        {
            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProjectId == escrow.ProjectId);

            var milestone = escrow.MilestoneId == null
                ? null
                : await _context.Milestones
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.MilestoneId == escrow.MilestoneId.Value);

            var clientProfile = await _context.ClientProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClientProfileId == escrow.ClientProfileId);

            return new EscrowResponse
            {
                EscrowId = escrow.EscrowId,
                ProjectId = escrow.ProjectId,
                ProjectTitle = project?.Title ?? string.Empty,
                MilestoneId = escrow.MilestoneId,
                MilestoneTitle = milestone?.Title,
                ClientProfileId = escrow.ClientProfileId,
                ClientUserId = clientProfile?.UserId ?? 0,
                Amount = escrow.Amount,
                Status = escrow.Status,
                CreatedAt = escrow.CreatedAt,
                UpdatedAt = escrow.UpdatedAt
            };
        }
    }
}