using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using System.Net.Http;

namespace AITasker.Infrastructure.Banking
{
    public class WalletService : IWalletService
    {
        private const string ProjectStatusPendingEscrow = "PENDING_ESCROW";
        private const string ProjectStatusActive = "ACTIVE";
        private const string ProjectStatusCancelled = "CANCELLED";

        private const string ContractStatusCancelled = "CANCELLED";

        private const string JobStatusActive = "ACTIVE";
        private const string JobStatusOpen = "OPEN";

        private const string ProposalStatusAccepted = "ACCEPTED";
        private const string ProposalStatusRejected = "REJECTED";
        private const string ProposalStatusWithdrawn = "WITHDRAWN";

        private const string ContractStatusConfirmed = "CONFIRMED";

        private const string MilestoneStatusPending = "PENDING";
        private const string MilestoneStatusFunded = "FUNDED";
        private const string MilestoneStatusSubmitted = "SUBMITTED";
        private const string MilestoneStatusApproved = "APPROVED";

        private const string PaymentStatusPending = "PENDING";
        private const string PaymentStatusLocked = "LOCKED";
        private const string PaymentStatusReleased = "RELEASED";

        private const string EscrowStatusLocked = "LOCKED";
        private const string EscrowStatusReleased = "RELEASED";

        private const string DeliverableStatusSubmitted = "SUBMITTED";
        private const string DeliverableStatusApproved = "APPROVED";

        private const string DisputeStatusOpen = "OPEN";

        private const string TransactionStatusSuccess = "SUCCESS";

        private const string TxDeposit = "DEPOSIT";
        private const string TxWithdraw = "WITHDRAW";
        private const string TxEscrowLock = "ESCROW_LOCK";
        private const string TxEscrowRelease = "ESCROW_RELEASE";
        private const string TxEscrowReceive = "ESCROW_RECEIVE";
        private const string TxExpertPendingEarningHold = "EXPERT_PENDING_EARNING_HOLD";
        private const string TxExpertServiceFee = "EXPERT_SERVICE_FEE";
        private const string TxPlatformFee = "PLATFORM_FEE";

        private const string DepositProviderPayOs = "PAYOS";
        private const string DepositOrderPending = "PENDING";
        private const string DepositOrderPaid = "PAID";
        private const string DepositOrderExpired = "EXPIRED";
        private const string DepositOrderCancelled = "CANCELLED";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly IPlatformWalletService _platformWalletService;
        private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;
        private readonly IContractFailureRollbackService _contractFailureRollbackService;

        public WalletService(
                AITaskerDbContext context,
                INotificationService notificationService,
                IConfiguration configuration,
                HttpClient httpClient,
                IPlatformWalletService platformWalletService,
                IMarketplaceWorkflowPolicyService workflowPolicyService,
                IContractFailureRollbackService contractFailureRollbackService)
        {
            _context = context;
            _notificationService = notificationService;
            _configuration = configuration;
            _httpClient = httpClient;
            _platformWalletService = platformWalletService;
            _workflowPolicyService = workflowPolicyService;
            _contractFailureRollbackService = contractFailureRollbackService;
        }

        public async Task<decimal> GetBalanceAsync(int userId)
        {
            var wallet = await GetOrCreateWalletAsync(userId);
            return wallet.AvailableBalance;
        }

        public async Task<Wallet> GetWalletByUserIdAsync(int userId)
        {
            return await GetOrCreateWalletAsync(userId);
        }

        public async Task<WalletResponse> GetMyWalletAsync(int userId)
        {
            var wallet = await GetOrCreateWalletAsync(userId);
            return MapWallet(wallet);
        }

        public async Task<IReadOnlyList<TransactionResponse>> GetMyTransactionsAsync(
            int userId,
            string? category = null,
            string? statusGroup = null)
        {
            var transactions = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var contexts = await TransactionDisplayResolver
                .LoadTransactionContextsAsync(_context, transactions);

            var responses = transactions
                .Select(transaction =>
                {
                    contexts.TryGetValue(transaction.TransactionId, out var displayContext);
                    return MapTransaction(transaction, displayContext);
                })
                .ToList();

            if (!string.IsNullOrWhiteSpace(category))
            {
                var normalizedCategory = category.Trim().ToUpperInvariant();
                responses = responses
                    .Where(x => x.Category == normalizedCategory)
                    .ToList();
            }

            if (!string.IsNullOrWhiteSpace(statusGroup))
            {
                var normalizedStatusGroup = statusGroup.Trim().ToUpperInvariant();
                responses = responses
                    .Where(x => x.StatusGroup == normalizedStatusGroup)
                    .ToList();
            }

            return responses;
        }

        public async Task<IReadOnlyList<EscrowResponse>> GetProjectEscrowsAsync(
            int currentUserId,
            int projectId)
        {
            var project = await GetProjectAsync(projectId);

            await EnsureUserCanAccessProjectAsync(
                currentUserId,
                project);

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

        public async Task<IReadOnlyList<DepositOrderResponse>> GetMyDepositOrdersAsync(int userId)
        {
            var orders = await _context.DepositOrders
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return orders
                .Select(x => MapDepositOrder(x, null))
                .ToList();
        }

        public async Task<DepositOrderResponse> GetDepositOrderByIdAsync(
            int currentUserId,
            int depositOrderId)
        {
            var order = await _context.DepositOrders
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DepositOrderId == depositOrderId);

            if (order == null)
            {
                throw new InvalidOperationException("Deposit order not found.");
            }

            await EnsureUserCanAccessDepositOrderAsync(currentUserId, order);

            WalletResponse? walletAfterPayment = null;

            if (string.Equals(order.Status, DepositOrderPaid, StringComparison.OrdinalIgnoreCase))
            {
                var wallet = await GetOrCreateWalletAsync(order.UserId);
                walletAfterPayment = MapWallet(wallet);
            }

            return MapDepositOrder(order, walletAfterPayment);
        }

        public async Task<DepositOrderResponse> CreateDepositOrderAsync(
            int userId,
            CreateDepositOrderRequest request)
        {
            var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();

            ValidateCreateDepositOrderRequest(
                request,
                workflowPolicy.MinimumDepositAmount,
                workflowPolicy.MaximumDepositAmount);

            EnsurePayOsConfigured();

            var userExists = await _context.Users.AnyAsync(x => x.UserId == userId);

            if (!userExists)
            {
                throw new InvalidOperationException("User not found.");
            }

            var now = DateTime.UtcNow;
            var orderCode = await GenerateDepositOrderCodeAsync(userId);
            var payOsOrderCode = await GeneratePayOsOrderCodeAsync();

            var amount = decimal.ToInt64(request.Amount);

            var description = $"AITASKER {orderCode}";

            if (description.Length > 25)
            {
                description = $"AITASKER {payOsOrderCode}";
            }

            var returnUrl = GetPayOsReturnUrl();
            var cancelUrl = GetPayOsCancelUrl();

            var payOsResult = await CreatePayOsPaymentLinkAsync(
                payOsOrderCode,
                amount,
                description,
                returnUrl,
                cancelUrl);

            var order = new DepositOrder
            {
                UserId = userId,
                OrderCode = orderCode,
                PayOsOrderCode = payOsOrderCode,
                Amount = amount,
                Provider = DepositProviderPayOs,
                PaymentContent = description,
                QrContent = payOsResult.QrCode ?? string.Empty,
                CheckoutUrl = payOsResult.CheckoutUrl,
                PaymentLinkId = payOsResult.PaymentLinkId,
                ReturnUrl = returnUrl,
                CancelUrl = cancelUrl,
                Status = DepositOrderPending,
                CreatedAt = now,
                ExpiresAt = now.AddMinutes(workflowPolicy.DepositOrderExpireMinutes),
                PaidAt = null,
                ProviderReference = payOsResult.PaymentLinkId
            };

            _context.DepositOrders.Add(order);
            await _context.SaveChangesAsync();

            return MapDepositOrder(order, null);
        }

        public async Task<DepositOrderResponse> ConfirmPayOsWebhookAsync(
            PayOsWebhookRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Webhook request is required.");
            }

            VerifyPayOsWebhookSignature(request);

            if (!request.Success || request.Code != "00")
            {
                throw new InvalidOperationException("payOS webhook is not successful.");
            }

            var orderCode = GetLongFromJson(request.Data, "orderCode");
            var amount = GetDecimalFromJson(request.Data, "amount");
            var paymentLinkId = GetStringFromJson(request.Data, "paymentLinkId");
            var reference = GetStringFromJson(request.Data, "reference");

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            var dbTransactionCompleted = false;

            try
            {
                var order = await _context.DepositOrders
                    .FirstOrDefaultAsync(x =>
                        x.PayOsOrderCode == orderCode ||
                        x.PaymentLinkId == paymentLinkId);

                if (order == null)
                {
                    throw new InvalidOperationException("Deposit order not found for payOS webhook.");
                }

                if (order.Amount != amount)
                {
                    throw new InvalidOperationException("Webhook amount does not match deposit order amount.");
                }

                if (string.Equals(order.Status, DepositOrderPaid, StringComparison.OrdinalIgnoreCase))
                {
                    var existingWallet = await GetOrCreateWalletAsync(order.UserId);
                    return MapDepositOrder(order, MapWallet(existingWallet));
                }

                if (!string.Equals(order.Status, DepositOrderPending, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Only PENDING deposit orders can be confirmed.");
                }

                if (order.ExpiresAt <= DateTime.UtcNow)
                {
                    order.Status = DepositOrderExpired;
                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                    dbTransactionCompleted = true;

                    throw new InvalidOperationException("Deposit order expired.");
                }

                var existingDepositTransaction = await _context.Transactions.AnyAsync(x =>
                    x.UserId == order.UserId &&
                    x.Type == TxDeposit &&
                    x.Status == TransactionStatusSuccess &&
                    x.ReferenceId == order.OrderCode);

                var wallet = await GetOrCreateWalletAsync(order.UserId);

                if (!existingDepositTransaction)
                {
                    wallet.AvailableBalance += order.Amount;
                    wallet.UpdatedAt = DateTime.UtcNow;

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = order.UserId,
                        ProjectId = null,
                        MilestoneId = null,
                        EscrowId = null,
                        Amount = order.Amount,
                        Type = TxDeposit,
                        Status = TransactionStatusSuccess,
                        Description = $"[Deposit] payOS payment confirmed for order {order.OrderCode}",
                        ReferenceId = order.OrderCode,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                order.Status = DepositOrderPaid;
                order.PaidAt = DateTime.UtcNow;
                order.ProviderReference = string.IsNullOrWhiteSpace(reference)
                    ? paymentLinkId
                    : reference;

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();
                dbTransactionCompleted = true;

                await _notificationService.CreateNotificationAsync(
                    order.UserId,
                    "Wallet deposit successful",
                    $"Your wallet balance has been increased by {order.Amount:N0} VND.",
                    "WALLET_DEPOSIT_SUCCESS",
                    relatedEntityType: "DEPOSIT_ORDER",
                    relatedEntityId: order.DepositOrderId);

                return MapDepositOrder(order, MapWallet(wallet));
            }
            catch
            {
                if (!dbTransactionCompleted)
                {
                    await dbTransaction.RollbackAsync();
                }

                throw;
            }
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
            var dbTransactionCompleted = false;

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
                dbTransactionCompleted = true;

                return true;
            }
            catch
            {
                if (!dbTransactionCompleted)
                {
                    await dbTransaction.RollbackAsync();
                }

                return false;
            }
        }

        public async Task<EscrowOperationResponse> LockProjectEscrowAsync(
            int currentUserId,
            int projectId,
            bool sendNotifications = true)
        {
            var ownsTransaction = _context.Database.CurrentTransaction == null;
            var dbTransaction = ownsTransaction
                ? await _context.Database.BeginTransactionAsync()
                : null;
            var dbTransactionCompleted = false;

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

                if (!string.Equals(contract.Status, ContractStatusConfirmed, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Contract must be CONFIRMED by both parties before locking escrow.");
                }

                if (!contract.ClientConfirmed || !contract.ExpertConfirmed)
                {
                    throw new InvalidOperationException("Both Client and Expert must sign the contract before escrow can be locked.");
                }

                var now = DateTime.UtcNow;


                if (project.EscrowLockedAt != null)
                {
                    throw new InvalidOperationException(
                        "Project escrow is already locked.");
                }


                var milestones = await _context.Milestones
                    .Where(m => m.ProjectId == project.ProjectId)
                    .OrderBy(m => m.OrderIndex)
                    .ThenBy(m => m.MilestoneId)
                    .ToListAsync();

                if (milestones.Count == 0)
                {
                    throw new InvalidOperationException("Project must have at least one milestone before locking escrow.");
                }

                var duplicatedOrderIndexes = milestones
                    .GroupBy(x => x.OrderIndex)
                    .Where(x => x.Count() > 1)
                    .Select(x => x.Key)
                    .ToList();

                if (duplicatedOrderIndexes.Count > 0)
                {
                    throw new InvalidOperationException(
                        "Milestone order index must be unique before locking escrow.");
                }

                var invalidDurationMilestones = milestones
                    .Where(x => x.DurationDays <= 0)
                    .ToList();

                if (invalidDurationMilestones.Count > 0)
                {
                    throw new InvalidOperationException(
                        "All milestones must have duration greater than 0 before locking escrow.");
                }

                var milestoneTotal = milestones.Sum(m => m.Amount);

                if (milestoneTotal != contract.FinalPrice)
                {
                    throw new InvalidOperationException(
                        $"Milestone total amount ({milestoneTotal}) must equal contract final price ({contract.FinalPrice}).");
                }

                var invalidMilestones = milestones
                    .Where(m =>
                        !string.Equals(m.Status, MilestoneStatusPending, StringComparison.OrdinalIgnoreCase) ||
                        !string.Equals(m.PaymentStatus, PaymentStatusPending, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (invalidMilestones.Count > 0)
                {
                    throw new InvalidOperationException("All milestones must be PENDING and payment status PENDING before locking project escrow.");
                }

                var existingEscrows = await _context.Escrows
                    .Where(e => e.ProjectId == project.ProjectId)
                    .ToListAsync();

                if (existingEscrows.Any())
                {
                    var allLocked = existingEscrows.Count == milestones.Count &&
                                    existingEscrows.All(e =>
                                        string.Equals(e.Status, EscrowStatusLocked, StringComparison.OrdinalIgnoreCase));

                    if (allLocked)
                    {
                        if (dbTransaction != null)
                        {
                            await dbTransaction.CommitAsync();
                            dbTransactionCompleted = true;
                        }

                        return await BuildProjectEscrowResponseAsync(
                            project,
                            null,
                            "Project escrow is already locked.");
                    }

                    throw new InvalidOperationException("Project escrow is partially initialized. Please check escrow records.");
                }

                var clientWallet = await GetOrCreateWalletAsync(clientProfile.UserId);

                if (clientWallet.AvailableBalance < contract.TotalClientPayment)
                {
                    throw new InvalidOperationException(
                        $"Client wallet balance is not enough to lock escrow. Required: {contract.TotalClientPayment:N0}, Available: {clientWallet.AvailableBalance:N0}.");
                }

                clientWallet.AvailableBalance -= contract.TotalClientPayment;
                clientWallet.LockedBalance += contract.FinalPrice;
                clientWallet.UpdatedAt = now;

                var cumulativeDurationDays = 0;

                foreach (var milestone in milestones)
                {
                    _context.Escrows.Add(new Escrow
                    {
                        ProjectId = project.ProjectId,
                        MilestoneId = milestone.MilestoneId,
                        ClientProfileId = clientProfile.ClientProfileId,
                        Amount = milestone.Amount,
                        Status = EscrowStatusLocked,
                        CreatedAt = now,
                        UpdatedAt = now
                    });

                    var durationDays = milestone.DurationDays;

                    cumulativeDurationDays += durationDays;

                    milestone.Deadline = now.AddDays(cumulativeDurationDays);
                    milestone.Status = MilestoneStatusFunded;
                    milestone.PaymentStatus = PaymentStatusLocked;
                }

                project.Status = ProjectStatusActive;
                project.StartDate = now;
                project.EscrowLockedAt = now;

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
                    CreatedAt = now
                });

                if (contract.PlatformFeeAmount > 0)
                {
                    var platformFeeReferenceId = $"PROJECT_{project.ProjectId}_PLATFORM_FEE";

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
                        ReferenceId = platformFeeReferenceId,
                        CreatedAt = now
                    });

                    await _platformWalletService.RecordPlatformFeeAsync(
                        project.ProjectId,
                        contract.ContractId,
                        clientProfile.UserId,
                        contract.PlatformFeeAmount,
                        platformFeeReferenceId,
                        now);
                }

                await _context.SaveChangesAsync();

                if (dbTransaction != null)
                {
                    await dbTransaction.CommitAsync();
                    dbTransactionCompleted = true;
                }

                if (sendNotifications)
                {
                    await _notificationService.CreateNotificationAsync(
                        clientProfile.UserId,
                        "Escrow locked",
                        $"Escrow has been locked for project: {project.Title}.",
                        "ESCROW_LOCKED",
                        relatedEntityType: "PROJECT",
                        relatedEntityId: project.ProjectId,
                        relatedProjectId: project.ProjectId);

                    await _notificationService.CreateNotificationAsync(
                        expertProfile.UserId,
                        "Project started",
                        $"Client locked escrow for project: {project.Title}. You can start working on milestones.",
                        "PROJECT_STARTED",
                        relatedEntityType: "PROJECT",
                        relatedEntityId: project.ProjectId,
                        relatedProjectId: project.ProjectId);
                }

                return await BuildProjectEscrowResponseAsync(
                    project,
                    null,
                    "Project escrow locked successfully.");
            }
            catch
            {
                if (dbTransaction != null && !dbTransactionCompleted)
                {
                    await dbTransaction.RollbackAsync();
                }

                throw;
            }
            finally
            {
                if (dbTransaction != null)
                {
                    await dbTransaction.DisposeAsync();
                }
            }
        }

        public async Task<EscrowOperationResponse> ReleaseEscrowAsync(
            int currentUserId,
            int milestoneId)
        {
            await using var dbTransaction = await _context.Database.BeginTransactionAsync();
            var dbTransactionCompleted = false;

            try
            {
                var milestone = await GetMilestoneAsync(milestoneId);
                var project = await GetProjectAsync(milestone.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

                if (clientProfile.UserId != currentUserId)
                {
                    throw new UnauthorizedAccessException("Only the project Client can approve deliverable and release escrow.");
                }

                if (!string.Equals(project.Status, ProjectStatusActive, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        "Escrow can only be released when project is ACTIVE.");
                }

                if (project.EscrowLockedAt == null)
                {
                    throw new InvalidOperationException(
                        "Project escrow is not locked yet.");
                }

                if (!string.Equals(milestone.PaymentStatus, PaymentStatusLocked, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        "Milestone escrow must be LOCKED before escrow release.");
                }

                if (!string.Equals(milestone.Status, MilestoneStatusSubmitted, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        "Milestone must have a submitted deliverable before escrow release.");
                }

                if (await HasOpenDisputeForMilestoneAsync(project.ProjectId, milestoneId))
                {
                    throw new InvalidOperationException("This milestone or project has an open dispute. Resolve the dispute instead of releasing escrow directly.");
                }

                var latestSubmittedDeliverable = await _context.Deliverables
                    .Where(d =>
                        d.MilestoneId == milestoneId &&
                        d.Status == DeliverableStatusSubmitted)
                    .OrderByDescending(d => d.VersionNumber)
                    .FirstOrDefaultAsync();

                if (latestSubmittedDeliverable == null)
                {
                    throw new InvalidOperationException("No submitted deliverable found for this milestone.");
                }

                var escrow = await GetLockedEscrowByMilestoneAsync(milestoneId);

                var clientWallet = await GetOrCreateWalletAsync(clientProfile.UserId);
                var expertWallet = await GetOrCreateWalletAsync(expertProfile.UserId);

                if (clientWallet.LockedBalance < escrow.Amount)
                {
                    throw new InvalidOperationException("Client locked balance is not enough to release escrow.");
                }

                var now = DateTime.UtcNow;
                var expertServiceFeeAmount = CalculateExpertServiceFee(escrow.Amount, contract.ExpertFeeRate);
                var expertNetAmount = escrow.Amount - expertServiceFeeAmount;

                clientWallet.LockedBalance -= escrow.Amount;
                clientWallet.UpdatedAt = now;

                expertWallet.PendingEarningsBalance += expertNetAmount;
                expertWallet.TotalEarning += expertNetAmount;
                expertWallet.UpdatedAt = now;

                escrow.Status = EscrowStatusReleased;
                escrow.UpdatedAt = now;

                milestone.Status = MilestoneStatusApproved;
                milestone.PaymentStatus = PaymentStatusReleased;

                latestSubmittedDeliverable.Status = DeliverableStatusApproved;
                latestSubmittedDeliverable.ClientFeedback = null;

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
                    CreatedAt = now
                });

                _context.Transactions.Add(new Transaction
                {
                    UserId = expertProfile.UserId,
                    ProjectId = project.ProjectId,
                    MilestoneId = milestone.MilestoneId,
                    EscrowId = escrow.EscrowId,
                    Amount = expertNetAmount,
                    Type = TxExpertPendingEarningHold,
                    Status = TransactionStatusSuccess,
                    Description = $"[Expert Pending Earning] Held net earning for Milestone ID {milestone.MilestoneId} until project completion. Expert service fee: {expertServiceFeeAmount:N0} VND.",
                    ReferenceId = $"MILESTONE_{milestone.MilestoneId}",
                    CreatedAt = now
                });

                if (expertServiceFeeAmount > 0)
                {
                    var expertFeeReferenceId = $"MILESTONE_{milestone.MilestoneId}_EXPERT_FEE";

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = expertProfile.UserId,
                        ProjectId = project.ProjectId,
                        MilestoneId = milestone.MilestoneId,
                        EscrowId = escrow.EscrowId,
                        Amount = -expertServiceFeeAmount,
                        Type = TxExpertServiceFee,
                        Status = TransactionStatusSuccess,
                        Description = $"[Expert Service Fee] Deducted {expertServiceFeeAmount:N0} VND expert service fee for Milestone ID {milestone.MilestoneId}.",
                        ReferenceId = expertFeeReferenceId,
                        CreatedAt = now
                    });

                    await _platformWalletService.RecordExpertServiceFeeAsync(
                        project.ProjectId,
                        contract.ContractId,
                        expertProfile.UserId,
                        expertServiceFeeAmount,
                        expertFeeReferenceId,
                        now);
                }

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();
                dbTransactionCompleted = true;

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Milestone earning held",
                    $"Milestone '{milestone.Title}' has been approved. The earning is held in pending earnings until the project is completed.",
                    "ESCROW_RELEASED",
                    relatedEntityType: "MILESTONE",
                    relatedEntityId: milestone.MilestoneId,
                    relatedProjectId: project.ProjectId,
                    relatedMilestoneId: milestone.MilestoneId);

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Escrow released",
                    $"Escrow for milestone '{milestone.Title}' has been released.",
                    "ESCROW_RELEASED",
                    relatedEntityType: "MILESTONE",
                    relatedEntityId: milestone.MilestoneId,
                    relatedProjectId: project.ProjectId,
                    relatedMilestoneId: milestone.MilestoneId);

                return await BuildProjectEscrowResponseAsync(
                    project,
                    milestone,
                    "Milestone escrow released successfully.");
            }
            catch
            {
                if (!dbTransactionCompleted)
                {
                    await dbTransaction.RollbackAsync();
                }

                throw;
            }
        }


        private static decimal CalculateExpertServiceFee(decimal amount, decimal expertFeeRate)
        {
            if (amount <= 0 || expertFeeRate <= 0)
            {
                return 0m;
            }

            return Math.Round(amount * expertFeeRate / 100m, 0, MidpointRounding.AwayFromZero);
        }

        private async Task<Wallet> GetOrCreateWalletAsync(int userId)
        {
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet != null)
            {
                return wallet;
            }

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
                PendingEarningsBalance = 0m,
                TotalEarning = 0m,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Wallets.Add(wallet);
            await _context.SaveChangesAsync();

            return wallet;
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

        private async Task<bool> HasOpenDisputeForMilestoneAsync(
            int projectId,
            int milestoneId)
        {
            return await _context.Disputes.AnyAsync(d =>
                d.Status == DisputeStatusOpen &&
                d.ProjectId == projectId &&
                (
                    d.MilestoneId == null ||
                    d.MilestoneId == milestoneId
                ));
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

        private async Task<Proposal> GetProposalAsync(int proposalId)
        {
            var proposal = await _context.Proposals
                .FirstOrDefaultAsync(p => p.ProposalId == proposalId);

            if (proposal == null)
            {
                throw new InvalidOperationException("Proposal not found.");
            }

            return proposal;
        }

        private async Task<JobPosting> GetJobAsync(int jobId)
        {
            var job = await _context.JobPostings
                .FirstOrDefaultAsync(j => j.JobPostingId == jobId);

            if (job == null)
            {
                throw new InvalidOperationException("Job posting not found.");
            }

            return job;
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
                PendingEarningsBalance = wallet.PendingEarningsBalance,
                WithdrawableBalance = wallet.AvailableBalance,
                TotalEarning = wallet.TotalEarning,
                UpdatedAt = wallet.UpdatedAt
            };
        }

        private static TransactionResponse MapTransaction(
            Transaction transaction,
            TransactionDisplayContext? context = null)
        {
            var display = TransactionDisplayResolver.Resolve(
                transaction.Type,
                transaction.Status,
                transaction.Description,
                transaction.ReferenceId,
                context);

            return new TransactionResponse
            {
                TransactionId = transaction.TransactionId,
                EscrowId = transaction.EscrowId,
                ProjectId = transaction.ProjectId,
                ProjectTitle = context?.ProjectTitle,
                MilestoneId = transaction.MilestoneId,
                MilestoneTitle = context?.MilestoneTitle,
                ContractId = context?.ContractId,
                ContractTitle = context?.ContractTitle,
                ProposalId = context?.ProposalId,
                ProposalTitle = context?.ProposalTitle,
                JobId = context?.JobId,
                JobTitle = context?.JobTitle,
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

        private static void ValidateCreateDepositOrderRequest(
            CreateDepositOrderRequest request,
            decimal minimumDepositAmount,
            decimal maximumDepositAmount)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Deposit order request is required.");
            }

            if (request.Amount <= 0)
            {
                throw new InvalidOperationException("Deposit amount must be greater than 0.");
            }

            if (request.Amount < minimumDepositAmount)
            {
                throw new InvalidOperationException($"Minimum deposit amount is {minimumDepositAmount:N0} VND.");
            }

            if (request.Amount > maximumDepositAmount)
            {
                throw new InvalidOperationException($"Maximum deposit amount is {maximumDepositAmount:N0} VND.");
            }
        }

        private async Task<string> GenerateDepositOrderCodeAsync(int userId)
        {
            for (var attempt = 0; attempt < 5; attempt++)
            {
                var orderCode = $"DEP{userId}{DateTime.UtcNow:yyyyMMddHHmmssfff}{Random.Shared.Next(100, 999)}";

                var exists = await _context.DepositOrders
                    .AnyAsync(x => x.OrderCode == orderCode);

                if (!exists)
                {
                    return orderCode;
                }
            }

            throw new InvalidOperationException("Could not generate unique deposit order code.");
        }

        private async Task EnsureUserCanAccessDepositOrderAsync(
            int currentUserId,
            DepositOrder order)
        {
            if (order.UserId == currentUserId)
            {
                return;
            }

            var currentUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == currentUserId);

            if (currentUser != null &&
                string.Equals(currentUser.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            throw new UnauthorizedAccessException("You do not have permission to access this deposit order.");
        }

        private static DepositOrderResponse MapDepositOrder(
            DepositOrder order,
            WalletResponse? walletAfterPayment)
        {
            return new DepositOrderResponse
            {
                DepositOrderId = order.DepositOrderId,
                UserId = order.UserId,
                OrderCode = order.OrderCode,
                PayOsOrderCode = order.PayOsOrderCode,
                Amount = order.Amount,
                Provider = order.Provider,
                PaymentContent = order.PaymentContent,
                QrContent = order.QrContent,
                CheckoutUrl = order.CheckoutUrl,
                PaymentLinkId = order.PaymentLinkId,
                ReturnUrl = order.ReturnUrl,
                CancelUrl = order.CancelUrl,
                Status = order.Status,
                ProviderReference = order.ProviderReference,
                CreatedAt = order.CreatedAt,
                ExpiresAt = order.ExpiresAt,
                PaidAt = order.PaidAt,
                WalletAfterPayment = walletAfterPayment
            };
        }

        private void EnsurePayOsConfigured()
        {
            if (!_configuration.GetValue<bool>("Payment:PayOs:Enabled"))
            {
                throw new InvalidOperationException("payOS payment is disabled.");
            }

            if (string.IsNullOrWhiteSpace(GetPayOsClientId()))
            {
                throw new InvalidOperationException("payOS ClientId is not configured.");
            }

            if (string.IsNullOrWhiteSpace(GetPayOsApiKey()))
            {
                throw new InvalidOperationException("payOS ApiKey is not configured.");
            }

            if (string.IsNullOrWhiteSpace(GetPayOsChecksumKey()))
            {
                throw new InvalidOperationException("payOS ChecksumKey is not configured.");
            }

            if (string.IsNullOrWhiteSpace(GetPayOsReturnUrl()))
            {
                throw new InvalidOperationException("payOS ReturnUrl is not configured.");
            }

            if (string.IsNullOrWhiteSpace(GetPayOsCancelUrl()))
            {
                throw new InvalidOperationException("payOS CancelUrl is not configured.");
            }
        }

        private async Task<PayOsCreatePaymentResult> CreatePayOsPaymentLinkAsync(
            long orderCode,
            long amount,
            string description,
            string returnUrl,
            string cancelUrl)
        {
            var signature = GeneratePayOsCreatePaymentSignature(
                amount,
                cancelUrl,
                description,
                orderCode,
                returnUrl);

            var payload = new
            {
                orderCode,
                amount,
                description,
                cancelUrl,
                returnUrl,
                signature
            };

            var baseUrl = GetPayOsBaseUrl().TrimEnd('/');
            var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{baseUrl}/v2/payment-requests");

            request.Headers.Add("x-client-id", GetPayOsClientId());
            request.Headers.Add("x-api-key", GetPayOsApiKey());

            request.Content = JsonContent.Create(payload);

            var response = await _httpClient.SendAsync(request);
            var responseText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"payOS create payment link failed: {responseText}");
            }

            using var json = JsonDocument.Parse(responseText);

            var root = json.RootElement;

            var code = root.GetProperty("code").GetString();

            if (code != "00")
            {
                var desc = root.TryGetProperty("desc", out var descElement)
                    ? descElement.GetString()
                    : "Unknown payOS error.";

                throw new InvalidOperationException($"payOS create payment link failed: {desc}");
            }

            var data = root.GetProperty("data");

            return new PayOsCreatePaymentResult
            {
                PaymentLinkId = GetStringFromJson(data, "paymentLinkId"),
                CheckoutUrl = GetStringFromJson(data, "checkoutUrl"),
                QrCode = GetStringFromJson(data, "qrCode")
            };
        }

        private string GeneratePayOsCreatePaymentSignature(
            long amount,
            string cancelUrl,
            string description,
            long orderCode,
            string returnUrl)
        {
            var data =
                $"amount={amount}" +
                $"&cancelUrl={cancelUrl}" +
                $"&description={description}" +
                $"&orderCode={orderCode}" +
                $"&returnUrl={returnUrl}";

            return HmacSha256(data, GetPayOsChecksumKey());
        }

        private void VerifyPayOsWebhookSignature(PayOsWebhookRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Signature))
            {
                throw new InvalidOperationException("Webhook signature is required.");
            }

            var data = BuildPayOsSignatureDataFromJson(request.Data);
            var expectedSignature = HmacSha256(data, GetPayOsChecksumKey());

            if (!string.Equals(
                    expectedSignature,
                    request.Signature,
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Invalid payOS webhook signature.");
            }
        }

        private static string BuildPayOsSignatureDataFromJson(JsonElement data)
        {
            if (data.ValueKind != JsonValueKind.Object)
            {
                throw new InvalidOperationException("Webhook data must be an object.");
            }

            var pairs = data
                .EnumerateObject()
                .OrderBy(x => x.Name, StringComparer.Ordinal)
                .Select(x => $"{x.Name}={JsonElementToSignatureString(x.Value)}");

            return string.Join("&", pairs);
        }

        private static string JsonElementToSignatureString(JsonElement value)
        {
            return value.ValueKind switch
            {
                JsonValueKind.String => value.GetString() ?? string.Empty,
                JsonValueKind.Number => value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => string.Empty,
                JsonValueKind.Undefined => string.Empty,
                _ => value.GetRawText()
            };
        }

        private static string HmacSha256(string data, string key)
        {
            var keyBytes = Encoding.UTF8.GetBytes(key);
            var dataBytes = Encoding.UTF8.GetBytes(data);

            using var hmac = new HMACSHA256(keyBytes);
            var hashBytes = hmac.ComputeHash(dataBytes);

            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }

        private async Task<long> GeneratePayOsOrderCodeAsync()
        {
            for (var attempt = 0; attempt < 5; attempt++)
            {
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var random = Random.Shared.Next(100, 999);
                var orderCodeText = $"{timestamp}{random}";

                if (!long.TryParse(orderCodeText, NumberStyles.None, CultureInfo.InvariantCulture, out var orderCode))
                {
                    continue;
                }

                var exists = await _context.DepositOrders
                    .AnyAsync(x => x.PayOsOrderCode == orderCode);

                if (!exists)
                {
                    return orderCode;
                }
            }

            throw new InvalidOperationException("Could not generate unique payOS order code.");
        }

        private static long GetLongFromJson(JsonElement data, string propertyName)
        {
            if (!data.TryGetProperty(propertyName, out var value))
            {
                throw new InvalidOperationException($"Webhook data missing {propertyName}.");
            }

            if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var longValue))
            {
                return longValue;
            }

            if (value.ValueKind == JsonValueKind.String &&
                long.TryParse(value.GetString(), out var parsedValue))
            {
                return parsedValue;
            }

            throw new InvalidOperationException($"Webhook data {propertyName} is invalid.");
        }

        private static decimal GetDecimalFromJson(JsonElement data, string propertyName)
        {
            if (!data.TryGetProperty(propertyName, out var value))
            {
                throw new InvalidOperationException($"Webhook data missing {propertyName}.");
            }

            if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var decimalValue))
            {
                return decimalValue;
            }

            if (value.ValueKind == JsonValueKind.String &&
                decimal.TryParse(value.GetString(), out var parsedValue))
            {
                return parsedValue;
            }

            throw new InvalidOperationException($"Webhook data {propertyName} is invalid.");
        }

        private static string GetStringFromJson(JsonElement data, string propertyName)
        {
            if (!data.TryGetProperty(propertyName, out var value))
            {
                return string.Empty;
            }

            if (value.ValueKind == JsonValueKind.Null ||
                value.ValueKind == JsonValueKind.Undefined)
            {
                return string.Empty;
            }

            return value.ValueKind == JsonValueKind.String
                ? value.GetString() ?? string.Empty
                : value.GetRawText();
        }

        private string GetPayOsBaseUrl()
        {
            return _configuration["Payment:PayOs:BaseUrl"]?.Trim()
                ?? "https://api-merchant.payos.vn";
        }

        private string GetPayOsClientId()
        {
            return GetPayOsDepositValue("ClientId");
        }

        private string GetPayOsApiKey()
        {
            return GetPayOsDepositValue("ApiKey");
        }

        private string GetPayOsChecksumKey()
        {
            return GetPayOsDepositValue("ChecksumKey");
        }

        private string GetPayOsReturnUrl()
        {
            return GetPayOsDepositValue("ReturnUrl");
        }

        private string GetPayOsCancelUrl()
        {
            return GetPayOsDepositValue("CancelUrl");
        }

        private string GetPayOsDepositValue(string key)
        {
            return _configuration[$"Payment:PayOs:Deposit:{key}"]?.Trim()
                ?? _configuration[$"Payment:PayOs:{key}"]?.Trim()
                ?? string.Empty;
        }

        private sealed class PayOsCreatePaymentResult
        {
            public string PaymentLinkId { get; set; } = string.Empty;

            public string CheckoutUrl { get; set; } = string.Empty;

            public string QrCode { get; set; } = string.Empty;
        }
    }
}