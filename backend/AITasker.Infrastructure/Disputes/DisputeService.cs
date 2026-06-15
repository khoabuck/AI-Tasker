using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Disputes
{
    public class DisputeService : IDisputeService
    {
        private const string ProjectStatusActive = "ACTIVE";
        private const string ProjectStatusDisputed = "DISPUTED";
        private const string ProjectStatusCompleted = "COMPLETED";

        private const string MilestoneStatusApproved = "APPROVED";
        private const string MilestoneStatusResolved = "RESOLVED";
        private const string MilestoneStatusDisputed = "DISPUTED";
        private const string MilestoneStatusDisputeResolved = "DISPUTE_RESOLVED";
        private const string MilestoneStatusReleased = "RELEASED";
        private const string MilestoneStatusRefunded = "REFUNDED";

        private const string PaymentStatusLocked = "LOCKED";
        private const string PaymentStatusFrozen = "FROZEN";
        private const string PaymentStatusReleased = "RELEASED";
        private const string PaymentStatusRefunded = "REFUNDED";
        private const string PaymentStatusPartialRefund = "PARTIAL_REFUND";

        private const string EscrowStatusLocked = "LOCKED";
        private const string EscrowStatusFrozen = "FROZEN";
        private const string EscrowStatusReleased = "RELEASED";
        private const string EscrowStatusRefunded = "REFUNDED";
        private const string EscrowStatusResolved = "RESOLVED";

        private const string DisputeStatusOpen = "OPEN";
        private const string DisputeStatusResolved = "RESOLVED";

        private const string ResolutionReleaseToExpert = "RELEASE_TO_EXPERT";
        private const string ResolutionRefundToClient = "REFUND_TO_CLIENT";
        private const string ResolutionPartialSplit = "PARTIAL_SPLIT";

        private const string TransactionStatusSuccess = "SUCCESS";
        private const string TxEscrowFreeze = "ESCROW_FREEZE";
        private const string TxEscrowRelease = "ESCROW_RELEASE";
        private const string TxRefund = "REFUND";
        private const string TxPartialRefund = "PARTIAL_REFUND";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;

        public DisputeService(
            AITaskerDbContext context,
            INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<DisputeResponse> OpenDisputeAsync(
            int currentUserId,
            OpenDisputeRequest request)
        {
            ValidateOpenRequest(request);

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var project = await GetProjectAsync(request.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

                var clientUser = await GetUserAsync(clientProfile.UserId);
                var expertUser = await GetUserAsync(expertProfile.UserId);

                var currentUserIsClient = clientProfile.UserId == currentUserId;
                var currentUserIsExpert = expertProfile.UserId == currentUserId;

                if (!currentUserIsClient && !currentUserIsExpert)
                {
                    throw new UnauthorizedAccessException("Only the project Client or Expert can open a dispute.");
                }

                if (!string.Equals(project.Status, ProjectStatusActive, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Dispute can only be opened when project is ACTIVE.");
                }

                var respondentUserId = currentUserIsClient
                    ? expertProfile.UserId
                    : clientProfile.UserId;

                if (request.RespondentUserId.HasValue &&
                    request.RespondentUserId.Value > 0 &&
                    request.RespondentUserId.Value != respondentUserId)
                {
                    throw new InvalidOperationException("RespondentUserId must be the other party of the project.");
                }

                Milestone? milestone = null;
                Escrow? escrow = null;

                if (request.MilestoneId.HasValue)
                {
                    milestone = await GetMilestoneAsync(request.MilestoneId.Value);

                    if (milestone.ProjectId != project.ProjectId)
                    {
                        throw new InvalidOperationException("Milestone does not belong to this project.");
                    }

                    if (IsMilestoneFinal(milestone))
                    {
                        throw new InvalidOperationException("Cannot open dispute for a finished milestone.");
                    }

                    if (request.DisputedAmount > milestone.Amount)
                    {
                        throw new InvalidOperationException("Disputed amount cannot exceed milestone amount.");
                    }

                    var existingMilestoneDispute = await _context.Disputes.AnyAsync(d =>
                        d.MilestoneId == milestone.MilestoneId &&
                        d.Status == DisputeStatusOpen);

                    if (existingMilestoneDispute)
                    {
                        throw new InvalidOperationException("An open dispute already exists for this milestone.");
                    }

                    escrow = await _context.Escrows
                        .FirstOrDefaultAsync(e =>
                            e.MilestoneId == milestone.MilestoneId &&
                            (e.Status == EscrowStatusLocked ||
                             e.Status == EscrowStatusFrozen));

                    if (escrow == null)
                    {
                        throw new InvalidOperationException("Locked escrow not found for this milestone.");
                    }

                    if (request.DisputedAmount != escrow.Amount)
                    {
                        throw new InvalidOperationException("Milestone dispute amount must equal the locked escrow amount for that milestone.");
                    }

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
                        Description = $"[Dispute Open] Escrow frozen for Milestone ID {milestone.MilestoneId}",
                        ReferenceId = $"MILESTONE_{milestone.MilestoneId}",
                        CreatedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    var existingProjectDispute = await _context.Disputes.AnyAsync(d =>
                        d.ProjectId == project.ProjectId &&
                        d.MilestoneId == null &&
                        d.Status == DisputeStatusOpen);

                    if (existingProjectDispute)
                    {
                        throw new InvalidOperationException("An open project-level dispute already exists for this project.");
                    }

                    var lockedEscrows = await _context.Escrows
                        .Where(e =>
                            e.ProjectId == project.ProjectId &&
                            (e.Status == EscrowStatusLocked ||
                             e.Status == EscrowStatusFrozen))
                        .ToListAsync();

                    if (!lockedEscrows.Any())
                    {
                        throw new InvalidOperationException("No locked escrow found for project-level dispute.");
                    }

                    var lockedAmount = lockedEscrows.Sum(e => e.Amount);

                    if (request.DisputedAmount != lockedAmount)
                    {
                        throw new InvalidOperationException("Project-level dispute amount must equal the total locked escrow amount of the project.");
                    }

                    foreach (var projectEscrow in lockedEscrows)
                    {
                        projectEscrow.Status = EscrowStatusFrozen;
                        projectEscrow.UpdatedAt = DateTime.UtcNow;

                        if (projectEscrow.MilestoneId.HasValue)
                        {
                            var frozenMilestone = await GetMilestoneAsync(projectEscrow.MilestoneId.Value);
                            frozenMilestone.Status = MilestoneStatusDisputed;
                            frozenMilestone.PaymentStatus = PaymentStatusFrozen;
                        }

                        _context.Transactions.Add(new Transaction
                        {
                            UserId = currentUserId,
                            ProjectId = project.ProjectId,
                            MilestoneId = projectEscrow.MilestoneId,
                            EscrowId = projectEscrow.EscrowId,
                            Amount = 0,
                            Type = TxEscrowFreeze,
                            Status = TransactionStatusSuccess,
                            Description = $"[Dispute Open] Escrow frozen for Project ID {project.ProjectId}",
                            ReferenceId = $"PROJECT_{project.ProjectId}",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                project.Status = ProjectStatusDisputed;

                var dispute = new Dispute
                {
                    ProjectId = project.ProjectId,
                    MilestoneId = request.MilestoneId,
                    OpenedByUserId = currentUserId,
                    RespondentUserId = respondentUserId,
                    Reason = request.Reason.Trim(),
                    DisputedAmount = request.DisputedAmount,
                    Status = DisputeStatusOpen,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Disputes.Add(dispute);
                await _context.SaveChangesAsync();

                if (!string.IsNullOrWhiteSpace(request.EvidenceText) ||
                    !string.IsNullOrWhiteSpace(request.EvidenceFileUrl))
                {
                    _context.DisputeEvidences.Add(new DisputeEvidence
                    {
                        DisputeId = dispute.DisputeId,
                        UploadedByUserId = currentUserId,
                        EvidenceText = string.IsNullOrWhiteSpace(request.EvidenceText)
                            ? request.Reason.Trim()
                            : request.EvidenceText.Trim(),
                        FileUrl = string.IsNullOrWhiteSpace(request.EvidenceFileUrl)
                            ? null
                            : request.EvidenceFileUrl.Trim(),
                        CreatedAt = DateTime.UtcNow
                    });

                    await _context.SaveChangesAsync();
                }

                var openerName = currentUserIsClient
                    ? clientUser.FullName
                    : expertUser.FullName;

                var respondentName = currentUserIsClient
                    ? expertUser.FullName
                    : clientUser.FullName;

                await _notificationService.CreateNotificationAsync(
                    respondentUserId,
                    "Dispute opened",
                    $"{openerName} opened a dispute in project '{project.Title}'.",
                    "DISPUTE_OPENED");

                await NotifyAdminsAsync(
                    "New dispute opened",
                    $"A dispute was opened in project '{project.Title}' by {openerName} against {respondentName}.",
                    "DISPUTE_OPENED");

                await transaction.CommitAsync();

                return await MapToDisputeResponseAsync(dispute.DisputeId);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<IReadOnlyList<DisputeResponse>> GetMyDisputesAsync(int currentUserId)
        {
            var disputeIds = await _context.Disputes
                .AsNoTracking()
                .Where(d =>
                    d.OpenedByUserId == currentUserId ||
                    d.RespondentUserId == currentUserId)
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => d.DisputeId)
                .ToListAsync();

            var responses = new List<DisputeResponse>();

            foreach (var disputeId in disputeIds)
            {
                responses.Add(await MapToDisputeResponseAsync(disputeId));
            }

            return responses;
        }

        public async Task<DisputeResponse> GetDisputeByIdAsync(
            int currentUserId,
            int disputeId)
        {
            var dispute = await GetDisputeAsync(disputeId);
            await EnsureCanAccessDisputeAsync(currentUserId, dispute);

            return await MapToDisputeResponseAsync(dispute.DisputeId);
        }

        public async Task<DisputeResponse> AddEvidenceAsync(
            int currentUserId,
            int disputeId,
            CreateDisputeEvidenceRequest request)
        {
            ValidateEvidenceRequest(request);

            var dispute = await GetDisputeAsync(disputeId);
            await EnsureCanAccessDisputeAsync(currentUserId, dispute);

            if (!string.Equals(dispute.Status, DisputeStatusOpen, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Evidence can only be added to OPEN disputes.");
            }

            _context.DisputeEvidences.Add(new DisputeEvidence
            {
                DisputeId = dispute.DisputeId,
                UploadedByUserId = currentUserId,
                EvidenceText = request.EvidenceText.Trim(),
                FileUrl = string.IsNullOrWhiteSpace(request.FileUrl)
                    ? null
                    : request.FileUrl.Trim(),
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            var otherUserId = dispute.OpenedByUserId == currentUserId
                ? dispute.RespondentUserId
                : dispute.OpenedByUserId;

            await _notificationService.CreateNotificationAsync(
                otherUserId,
                "New dispute evidence",
                $"New evidence was submitted for dispute #{dispute.DisputeId}.",
                "DISPUTE_EVIDENCE_SUBMITTED");

            await NotifyAdminsAsync(
                "New dispute evidence",
                $"New evidence was submitted for dispute #{dispute.DisputeId}.",
                "DISPUTE_EVIDENCE_SUBMITTED");

            return await MapToDisputeResponseAsync(dispute.DisputeId);
        }

        public async Task<IReadOnlyList<DisputeResponse>> GetAdminDisputesAsync()
        {
            var disputeIds = await _context.Disputes
                .AsNoTracking()
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => d.DisputeId)
                .ToListAsync();

            var responses = new List<DisputeResponse>();

            foreach (var disputeId in disputeIds)
            {
                responses.Add(await MapToDisputeResponseAsync(disputeId));
            }

            return responses;
        }

        public async Task<DisputeResponse> ResolveDisputeAsync(
            int adminUserId,
            int disputeId,
            ResolveDisputeRequest request)
        {
            ValidateResolveRequest(request);

            await using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var admin = await GetUserAsync(adminUserId);

                if (!string.Equals(admin.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
                {
                    throw new UnauthorizedAccessException("Only Admin can resolve disputes.");
                }

                var dispute = await GetDisputeAsync(disputeId);

                if (!string.Equals(dispute.Status, DisputeStatusOpen, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Only OPEN disputes can be resolved.");
                }

                var project = await GetProjectAsync(dispute.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

                var clientUser = await GetUserAsync(clientProfile.UserId);
                var expertUser = await GetUserAsync(expertProfile.UserId);

                var normalizedResolutionType = request.ResolutionType.Trim().ToUpperInvariant();

                decimal expertAmount;
                decimal clientAmount;

                if (normalizedResolutionType == ResolutionReleaseToExpert)
                {
                    expertAmount = dispute.DisputedAmount;
                    clientAmount = 0;
                }
                else if (normalizedResolutionType == ResolutionRefundToClient)
                {
                    expertAmount = 0;
                    clientAmount = dispute.DisputedAmount;
                }
                else if (normalizedResolutionType == ResolutionPartialSplit)
                {
                    expertAmount = request.ExpertAmount;
                    clientAmount = request.ClientAmount;
                }
                else
                {
                    throw new InvalidOperationException("ResolutionType must be RELEASE_TO_EXPERT, REFUND_TO_CLIENT, or PARTIAL_SPLIT.");
                }

                if (expertAmount < 0 || clientAmount < 0)
                {
                    throw new InvalidOperationException("Resolution amounts cannot be negative.");
                }

                if (expertAmount + clientAmount != dispute.DisputedAmount)
                {
                    throw new InvalidOperationException("ExpertAmount plus ClientAmount must equal DisputedAmount.");
                }

                Milestone? milestone = null;
                Escrow? escrow = null;
                var projectEscrows = new List<Escrow>();

                if (dispute.MilestoneId.HasValue)
                {
                    milestone = await GetMilestoneAsync(dispute.MilestoneId.Value);

                    escrow = await _context.Escrows
                        .FirstOrDefaultAsync(e =>
                            e.MilestoneId == milestone.MilestoneId &&
                            (e.Status == EscrowStatusFrozen ||
                             e.Status == EscrowStatusLocked));

                    if (escrow == null)
                    {
                        throw new InvalidOperationException("Frozen escrow not found for dispute milestone.");
                    }

                    if (dispute.DisputedAmount != escrow.Amount)
                    {
                        throw new InvalidOperationException("Milestone dispute amount must equal escrow amount before resolution.");
                    }
                }
                else
                {
                    projectEscrows = await _context.Escrows
                        .Where(e =>
                            e.ProjectId == project.ProjectId &&
                            (e.Status == EscrowStatusFrozen ||
                             e.Status == EscrowStatusLocked))
                        .ToListAsync();

                    if (!projectEscrows.Any())
                    {
                        throw new InvalidOperationException("Frozen escrows not found for project-level dispute.");
                    }

                    var projectEscrowTotal = projectEscrows.Sum(e => e.Amount);

                    if (dispute.DisputedAmount != projectEscrowTotal)
                    {
                        throw new InvalidOperationException("Project-level dispute amount must equal total frozen escrow amount before resolution.");
                    }
                }

                var clientWallet = await GetOrCreateWalletAsync(clientProfile.UserId);
                var expertWallet = await GetOrCreateWalletAsync(expertProfile.UserId);

                if (clientWallet.LockedBalance < dispute.DisputedAmount)
                {
                    throw new InvalidOperationException("Client locked balance is insufficient for dispute resolution.");
                }

                clientWallet.LockedBalance -= dispute.DisputedAmount;
                clientWallet.UpdatedAt = DateTime.UtcNow;

                var referenceId = dispute.MilestoneId.HasValue
                    ? $"MILESTONE_{dispute.MilestoneId.Value}"
                    : $"DISPUTE_{dispute.DisputeId}";

                if (clientAmount > 0)
                {
                    clientWallet.AvailableBalance += clientAmount;
                    clientWallet.UpdatedAt = DateTime.UtcNow;

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = clientProfile.UserId,
                        ProjectId = project.ProjectId,
                        MilestoneId = dispute.MilestoneId,
                        EscrowId = escrow?.EscrowId,
                        Amount = clientAmount,
                        Type = normalizedResolutionType == ResolutionPartialSplit
                            ? TxPartialRefund
                            : TxRefund,
                        Status = TransactionStatusSuccess,
                        Description = $"[Dispute Resolution] Client refund from Dispute ID {dispute.DisputeId}",
                        ReferenceId = referenceId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                if (expertAmount > 0)
                {
                    expertWallet.AvailableBalance += expertAmount;
                    expertWallet.TotalEarning += expertAmount;
                    expertWallet.UpdatedAt = DateTime.UtcNow;

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = expertProfile.UserId,
                        ProjectId = project.ProjectId,
                        MilestoneId = dispute.MilestoneId,
                        EscrowId = escrow?.EscrowId,
                        Amount = expertAmount,
                        Type = normalizedResolutionType == ResolutionPartialSplit
                            ? TxPartialRefund
                            : TxEscrowRelease,
                        Status = TransactionStatusSuccess,
                        Description = $"[Dispute Resolution] Expert release from Dispute ID {dispute.DisputeId}",
                        ReferenceId = referenceId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                if (escrow != null)
                {
                    if (normalizedResolutionType == ResolutionReleaseToExpert)
                    {
                        escrow.Status = EscrowStatusReleased;
                    }
                    else if (normalizedResolutionType == ResolutionRefundToClient)
                    {
                        escrow.Status = EscrowStatusRefunded;
                    }
                    else
                    {
                        escrow.Status = EscrowStatusResolved;
                    }

                    escrow.UpdatedAt = DateTime.UtcNow;
                }

                foreach (var projectEscrow in projectEscrows)
                {
                    if (normalizedResolutionType == ResolutionReleaseToExpert)
                    {
                        projectEscrow.Status = EscrowStatusReleased;
                    }
                    else if (normalizedResolutionType == ResolutionRefundToClient)
                    {
                        projectEscrow.Status = EscrowStatusRefunded;
                    }
                    else
                    {
                        projectEscrow.Status = EscrowStatusResolved;
                    }

                    projectEscrow.UpdatedAt = DateTime.UtcNow;

                    if (projectEscrow.MilestoneId.HasValue)
                    {
                        var projectMilestone = await GetMilestoneAsync(projectEscrow.MilestoneId.Value);
                        projectMilestone.Status = MilestoneStatusResolved;

                        if (normalizedResolutionType == ResolutionReleaseToExpert)
                        {
                            projectMilestone.PaymentStatus = PaymentStatusReleased;
                        }
                        else if (normalizedResolutionType == ResolutionRefundToClient)
                        {
                            projectMilestone.PaymentStatus = PaymentStatusRefunded;
                        }
                        else
                        {
                            projectMilestone.PaymentStatus = PaymentStatusPartialRefund;
                        }
                    }
                }

                if (milestone != null)
                {
                    milestone.Status = MilestoneStatusResolved;

                    if (normalizedResolutionType == ResolutionReleaseToExpert)
                    {
                        milestone.PaymentStatus = PaymentStatusReleased;
                    }
                    else if (normalizedResolutionType == ResolutionRefundToClient)
                    {
                        milestone.PaymentStatus = PaymentStatusRefunded;
                    }
                    else
                    {
                        milestone.PaymentStatus = PaymentStatusPartialRefund;
                    }
                }

                dispute.Status = DisputeStatusResolved;
                dispute.ResolutionType = normalizedResolutionType;
                dispute.AdminDecision = string.IsNullOrWhiteSpace(request.AdminDecision)
                    ? $"Admin resolved dispute with {normalizedResolutionType}."
                    : request.AdminDecision.Trim();
                dispute.ResolvedAt = DateTime.UtcNow;

                await UpdateProjectStatusAfterResolutionAsync(project);

                await _context.SaveChangesAsync();

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Dispute resolved",
                    $"Dispute #{dispute.DisputeId} has been resolved. Client receives {clientAmount}, Expert receives {expertAmount}.",
                    "DISPUTE_RESOLVED");

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Dispute resolved",
                    $"Dispute #{dispute.DisputeId} has been resolved. Client receives {clientAmount}, Expert receives {expertAmount}.",
                    "DISPUTE_RESOLVED");

                await dbTransaction.CommitAsync();

                return await MapToDisputeResponseAsync(dispute.DisputeId);
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        private static void ValidateOpenRequest(OpenDisputeRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Dispute request is required.");
            }

            if (request.ProjectId <= 0)
            {
                throw new InvalidOperationException("ProjectId is required.");
            }

            if (request.DisputedAmount <= 0)
            {
                throw new InvalidOperationException("DisputedAmount must be greater than 0.");
            }

            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                throw new InvalidOperationException("Dispute reason is required.");
            }
        }

        private static void ValidateEvidenceRequest(CreateDisputeEvidenceRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Evidence request is required.");
            }

            if (string.IsNullOrWhiteSpace(request.EvidenceText) &&
                string.IsNullOrWhiteSpace(request.FileUrl))
            {
                throw new InvalidOperationException("Evidence text or file URL is required.");
            }
        }

        private static void ValidateResolveRequest(ResolveDisputeRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Resolve dispute request is required.");
            }

            if (string.IsNullOrWhiteSpace(request.ResolutionType))
            {
                throw new InvalidOperationException("ResolutionType is required.");
            }
        }

        private static bool IsMilestoneFinal(Milestone milestone)
        {
            var status = milestone.Status?.Trim().ToUpperInvariant();

            return status == MilestoneStatusApproved ||
                   status == MilestoneStatusResolved ||
                   status == MilestoneStatusDisputeResolved ||
                   status == MilestoneStatusReleased ||
                   status == MilestoneStatusRefunded;
        }

        private static bool IsMilestoneFinished(Milestone milestone)
        {
            return IsMilestoneFinal(milestone);
        }

        private async Task UpdateProjectStatusAfterResolutionAsync(Project project)
        {
            var hasOpenDispute = await _context.Disputes.AnyAsync(d =>
                d.ProjectId == project.ProjectId &&
                d.Status == DisputeStatusOpen);

            if (hasOpenDispute)
            {
                project.Status = ProjectStatusDisputed;
                return;
            }

            var milestones = await _context.Milestones
                .Where(m => m.ProjectId == project.ProjectId)
                .ToListAsync();

            if (milestones.Any() && milestones.All(IsMilestoneFinished))
            {
                project.Status = ProjectStatusCompleted;
                project.EndDate ??= DateTime.UtcNow;
                return;
            }

            project.Status = ProjectStatusActive;
        }

        private async Task NotifyAdminsAsync(
            string title,
            string content,
            string type)
        {
            var adminUserIds = await _context.Users
                .AsNoTracking()
                .Where(u => u.Role == "ADMIN")
                .Select(u => u.UserId)
                .ToListAsync();

            foreach (var adminUserId in adminUserIds)
            {
                await _notificationService.CreateNotificationAsync(
                    adminUserId,
                    title,
                    content,
                    type);
            }
        }

        private async Task EnsureCanAccessDisputeAsync(
            int currentUserId,
            Dispute dispute)
        {
            var user = await GetUserAsync(currentUserId);

            if (string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            if (dispute.OpenedByUserId == currentUserId ||
                dispute.RespondentUserId == currentUserId)
            {
                return;
            }

            throw new UnauthorizedAccessException("You do not have permission to access this dispute.");
        }

        private async Task<Wallet> GetOrCreateWalletAsync(int userId)
        {
            var wallet = await _context.Wallets
                .FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet != null)
            {
                return wallet;
            }

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

            return wallet;
        }

        private async Task<Dispute> GetDisputeAsync(int disputeId)
        {
            var dispute = await _context.Disputes
                .FirstOrDefaultAsync(d => d.DisputeId == disputeId);

            if (dispute == null)
            {
                throw new InvalidOperationException("Dispute not found.");
            }

            return dispute;
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

        private async Task<DisputeResponse> MapToDisputeResponseAsync(int disputeId)
        {
            var dispute = await _context.Disputes
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.DisputeId == disputeId);

            if (dispute == null)
            {
                throw new InvalidOperationException("Dispute not found.");
            }

            var project = await _context.Projects
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.ProjectId == dispute.ProjectId);

            if (project == null)
            {
                throw new InvalidOperationException("Project not found.");
            }

            var contract = await _context.ProjectContracts
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ContractId == project.ContractId);

            if (contract == null)
            {
                throw new InvalidOperationException("Contract not found.");
            }

            var clientProfile = await _context.ClientProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClientProfileId == contract.ClientId);

            var expertProfile = await _context.ExpertProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.ExpertProfileId == contract.ExpertId);

            if (clientProfile == null || expertProfile == null)
            {
                throw new InvalidOperationException("Contract parties are invalid.");
            }

            var clientUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == clientProfile.UserId);

            var expertUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == expertProfile.UserId);

            var openedByUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == dispute.OpenedByUserId);

            var respondentUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == dispute.RespondentUserId);

            var milestone = dispute.MilestoneId.HasValue
                ? await _context.Milestones
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.MilestoneId == dispute.MilestoneId.Value)
                : null;

            var evidences = await _context.DisputeEvidences
                .AsNoTracking()
                .Where(e => e.DisputeId == dispute.DisputeId)
                .OrderBy(e => e.CreatedAt)
                .ToListAsync();

            var evidenceResponses = new List<DisputeEvidenceResponse>();

            foreach (var evidence in evidences)
            {
                var uploader = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.UserId == evidence.UploadedByUserId);

                evidenceResponses.Add(new DisputeEvidenceResponse
                {
                    EvidenceId = evidence.EvidenceId,
                    DisputeId = evidence.DisputeId,
                    UploadedByUserId = evidence.UploadedByUserId,
                    UploadedByName = uploader?.FullName ?? string.Empty,
                    EvidenceText = evidence.EvidenceText,
                    FileUrl = evidence.FileUrl,
                    CreatedAt = evidence.CreatedAt
                });
            }

            return new DisputeResponse
            {
                DisputeId = dispute.DisputeId,
                ProjectId = dispute.ProjectId,
                ProjectTitle = project.Title,
                MilestoneId = dispute.MilestoneId,
                MilestoneTitle = milestone?.Title,

                ClientProfileId = clientProfile.ClientProfileId,
                ClientUserId = clientProfile.UserId,
                ClientName = clientUser?.FullName ?? string.Empty,

                ExpertProfileId = expertProfile.ExpertProfileId,
                ExpertUserId = expertProfile.UserId,
                ExpertName = expertUser?.FullName ?? string.Empty,

                OpenedByUserId = dispute.OpenedByUserId,
                OpenedByName = openedByUser?.FullName ?? string.Empty,
                RespondentUserId = dispute.RespondentUserId,
                RespondentName = respondentUser?.FullName ?? string.Empty,

                Reason = dispute.Reason,
                DisputedAmount = dispute.DisputedAmount,
                Status = dispute.Status,
                ResolutionType = dispute.ResolutionType,
                AdminDecision = dispute.AdminDecision,
                CreatedAt = dispute.CreatedAt,
                ResolvedAt = dispute.ResolvedAt,
                Evidences = evidenceResponses
            };
        }
    }
}