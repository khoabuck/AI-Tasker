using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Domain.Constants;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Disputes
{
    public class DisputeService : IDisputeService
    {
        private const string ProjectStatusPendingEscrow = "PENDING_ESCROW";

        private const string ProjectStatusActive = "ACTIVE";
        private const string ProjectStatusDisputed = "DISPUTED";
        private const string ProjectStatusCompleted = "COMPLETED";
        private const string ProjectStatusCancelled = "CANCELLED";

        private const string ContractStatusConfirmed = "CONFIRMED";

        private const string JobStatusActive = "ACTIVE";
        private const string JobStatusDisputed = "DISPUTED";
        private const string JobStatusCompleted = "COMPLETED";

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

        private const string EscrowStatusLocked = "LOCKED";
        private const string EscrowStatusFrozen = "FROZEN";
        private const string EscrowStatusReleased = "RELEASED";
        private const string EscrowStatusRefunded = "REFUNDED";

        private const string DisputeStatusOpen = "OPEN";
        private const string DisputeStatusResolved = "RESOLVED";

        private const string DeliverableStatusSubmitted = "SUBMITTED";
        private const string DeliverableStatusApproved = "APPROVED";

        private const string ResolutionReleaseToExpert = "RELEASE_TO_EXPERT";
        private const string ResolutionRefundToClient = "REFUND_TO_CLIENT";

        private const string UserStatusSuspended = "SUSPENDED";
        private const string UserStatusBanned = "BANNED";

        private const string TransactionStatusSuccess = "SUCCESS";
        private const string TxEscrowFreeze = "ESCROW_FREEZE";
        private const string TxEscrowRelease = "ESCROW_RELEASE";
        private const string TxExpertPendingEarningHold = "EXPERT_PENDING_EARNING_HOLD";
        private const string TxExpertPendingEarningRelease = "EXPERT_PENDING_EARNING_RELEASE";
        private const string TxRefund = "REFUND";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;

        public DisputeService(
            AITaskerDbContext context,
            INotificationService notificationService,
            IMarketplaceWorkflowPolicyService workflowPolicyService)
        {
            _context = context;
            _notificationService = notificationService;
            _workflowPolicyService = workflowPolicyService;
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

                EnsureProjectReadyForDispute(
                    project,
                    contract);

                var existingOpenDisputeForProject = await _context.Disputes.AnyAsync(d =>
                    d.ProjectId == project.ProjectId &&
                    d.Status == DisputeStatusOpen);

                if (existingOpenDisputeForProject)
                {
                    throw new InvalidOperationException(
                        "An open dispute already exists for this project.");
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

                    EnsureMilestoneReadyForDispute(
                        milestone);

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
                            e.Status == EscrowStatusLocked);

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
                    var lockedEscrows = await _context.Escrows
                        .Where(e =>
                            e.ProjectId == project.ProjectId &&
                            e.Status == EscrowStatusLocked)
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

                await UpdateJobStatusByProjectAsync(
                    project,
                    JobStatusDisputed);

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
                    "DISPUTE_OPENED",
                    relatedEntityType: "DISPUTE",
                    relatedEntityId: dispute.DisputeId,
                    relatedProjectId: dispute.ProjectId,
                    relatedMilestoneId: dispute.MilestoneId,
                    relatedDisputeId: dispute.DisputeId);

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
                "DISPUTE_EVIDENCE_SUBMITTED",
                relatedEntityType: "DISPUTE",
                relatedEntityId: dispute.DisputeId,
                relatedProjectId: dispute.ProjectId,
                relatedMilestoneId: dispute.MilestoneId,
                relatedDisputeId: dispute.DisputeId);

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

                if (project.EscrowLockedAt == null)
                {
                    throw new InvalidOperationException("Cannot resolve dispute because project escrow was never locked.");
                }

                if (!string.Equals(project.Status, ProjectStatusDisputed, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Only DISPUTED projects can have disputes resolved.");
                }

                var normalizedResolutionType = request.ResolutionType.Trim().ToUpperInvariant();

                decimal expertAmount;
                decimal clientAmount;
                int loserUserId;

                if (normalizedResolutionType == ResolutionReleaseToExpert)
                {
                    expertAmount = dispute.DisputedAmount;
                    clientAmount = 0;
                    loserUserId = clientProfile.UserId;
                }
                else if (normalizedResolutionType == ResolutionRefundToClient)
                {
                    expertAmount = 0;
                    clientAmount = dispute.DisputedAmount;
                    loserUserId = expertProfile.UserId;
                }
                else
                {
                    throw new InvalidOperationException("ResolutionType must be RELEASE_TO_EXPERT or REFUND_TO_CLIENT.");
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
                            e.Status == EscrowStatusFrozen);

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
                            e.Status == EscrowStatusFrozen)
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
                        Type = TxRefund,
                        Status = TransactionStatusSuccess,
                        Description = $"[Dispute Resolution] Client refund from Dispute ID {dispute.DisputeId}",
                        ReferenceId = referenceId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                if (expertAmount > 0)
                {
                    expertWallet.PendingEarningsBalance += expertAmount;
                    expertWallet.TotalEarning += expertAmount;
                    expertWallet.UpdatedAt = DateTime.UtcNow;

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = expertProfile.UserId,
                        ProjectId = project.ProjectId,
                        MilestoneId = dispute.MilestoneId,
                        EscrowId = escrow?.EscrowId,
                        Amount = expertAmount,
                        Type = TxExpertPendingEarningHold,
                        Status = TransactionStatusSuccess,
                        Description = $"[Dispute Resolution] Expert earning held from Dispute ID {dispute.DisputeId} until project completion",
                        ReferenceId = referenceId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                if (escrow != null)
                {
                    escrow.Status = normalizedResolutionType == ResolutionReleaseToExpert
                        ? EscrowStatusReleased
                        : EscrowStatusRefunded;

                    escrow.UpdatedAt = DateTime.UtcNow;
                }

                foreach (var projectEscrow in projectEscrows)
                {
                    projectEscrow.Status = normalizedResolutionType == ResolutionReleaseToExpert
                        ? EscrowStatusReleased
                        : EscrowStatusRefunded;

                    projectEscrow.UpdatedAt = DateTime.UtcNow;

                    if (projectEscrow.MilestoneId.HasValue)
                    {
                        var projectMilestone = await GetMilestoneAsync(projectEscrow.MilestoneId.Value);

                        projectMilestone.Status = MilestoneStatusResolved;
                        projectMilestone.PaymentStatus = normalizedResolutionType == ResolutionReleaseToExpert
                            ? PaymentStatusReleased
                            : PaymentStatusRefunded;

                        await MarkLatestDeliverableAfterDisputeResolutionAsync(
                            projectMilestone.MilestoneId,
                            normalizedResolutionType);
                    }
                }

                if (milestone != null)
                {
                    milestone.Status = MilestoneStatusResolved;
                    milestone.PaymentStatus = normalizedResolutionType == ResolutionReleaseToExpert
                        ? PaymentStatusReleased
                        : PaymentStatusRefunded;

                    await MarkLatestDeliverableAfterDisputeResolutionAsync(
                        milestone.MilestoneId,
                        normalizedResolutionType);
                }

                dispute.Status = DisputeStatusResolved;
                dispute.ResolutionType = normalizedResolutionType;
                dispute.AdminDecision = string.IsNullOrWhiteSpace(request.AdminDecision)
                    ? $"Admin resolved dispute with {normalizedResolutionType}."
                    : request.AdminDecision.Trim();
                dispute.ResolvedAt = DateTime.UtcNow;

                await ApplyLostDisputePolicyAsync(
                    loserUserId,
                    dispute.DisputeId);

                await UpdateProjectStatusAfterResolutionAsync(
                    project,
                    dispute.DisputeId);

                if (string.Equals(project.Status, ProjectStatusCompleted, StringComparison.OrdinalIgnoreCase))
                {
                    await ReleaseExpertPendingEarningsForProjectAsync(
                        project,
                        expertProfile);
                }

                await _context.SaveChangesAsync();

                await _notificationService.CreateNotificationAsync(
                    clientProfile.UserId,
                    "Dispute resolved",
                    $"Dispute #{dispute.DisputeId} has been resolved. Client receives {clientAmount}, Expert receives {expertAmount}.",
                    "DISPUTE_RESOLVED",
                    relatedEntityType: "DISPUTE",
                    relatedEntityId: dispute.DisputeId,
                    relatedProjectId: dispute.ProjectId,
                    relatedMilestoneId: dispute.MilestoneId,
                    relatedDisputeId: dispute.DisputeId);

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Dispute resolved",
                    $"Dispute #{dispute.DisputeId} has been resolved. Client receives {clientAmount}, Expert receives {expertAmount}.",
                    "DISPUTE_RESOLVED",
                    relatedEntityType: "DISPUTE",
                    relatedEntityId: dispute.DisputeId,
                    relatedProjectId: dispute.ProjectId,
                    relatedMilestoneId: dispute.MilestoneId,
                    relatedDisputeId: dispute.DisputeId);

                await dbTransaction.CommitAsync();

                return await MapToDisputeResponseAsync(dispute.DisputeId);
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }
        }

        private async Task MarkLatestDeliverableAfterDisputeResolutionAsync(
            int milestoneId,
            string normalizedResolutionType)
        {
            var latestDeliverable = await _context.Deliverables
                .Where(d =>
                    d.MilestoneId == milestoneId &&
                    d.Status == DeliverableStatusSubmitted)
                .OrderByDescending(d => d.VersionNumber)
                .FirstOrDefaultAsync();

            if (latestDeliverable == null)
            {
                return;
            }

            latestDeliverable.ReviewedAt ??= DateTime.UtcNow;

            if (normalizedResolutionType == ResolutionReleaseToExpert)
            {
                latestDeliverable.Status = DeliverableStatusApproved;
                latestDeliverable.ClientFeedback = null;
            }
            else if (normalizedResolutionType == ResolutionRefundToClient)
            {
                latestDeliverable.ClientFeedback = "Dispute resolved with refund to Client.";
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

            var normalizedResolutionType = request.ResolutionType.Trim().ToUpperInvariant();

            if (normalizedResolutionType != ResolutionReleaseToExpert &&
                normalizedResolutionType != ResolutionRefundToClient)
            {
                throw new InvalidOperationException("ResolutionType must be RELEASE_TO_EXPERT or REFUND_TO_CLIENT.");
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

        private static void EnsureProjectReadyForDispute(
            Project project,
            ProjectContract contract)
        {
            if (!string.Equals(contract.Status, ContractStatusConfirmed, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Dispute can only be opened after contract is CONFIRMED.");
            }

            if (string.Equals(project.Status, ProjectStatusPendingEscrow, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Dispute cannot be opened before escrow is locked.");
            }

            if (string.Equals(project.Status, ProjectStatusCancelled, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Dispute cannot be opened for a project cancelled before escrow.");
            }

            if (!string.Equals(project.Status, ProjectStatusActive, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Dispute can only be opened when project is ACTIVE.");
            }

            if (project.EscrowLockedAt == null)
            {
                throw new InvalidOperationException(
                    "Dispute cannot be opened before project escrow is locked.");
            }

            if (project.EscrowExpiredAt != null)
            {
                throw new InvalidOperationException(
                    "Dispute cannot be opened because escrow lock deadline already expired.");
            }
        }

        private static void EnsureMilestoneReadyForDispute(Milestone milestone)
        {
            if (IsMilestoneFinal(milestone))
            {
                throw new InvalidOperationException(
                    "Cannot open dispute for a finished milestone.");
            }

            if (!string.Equals(milestone.PaymentStatus, PaymentStatusLocked, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Milestone dispute can only be opened when milestone escrow is LOCKED.");
            }
        }

        private async Task ReleaseExpertPendingEarningsForProjectAsync(
            Project project,
            ExpertProfile expertProfile)
        {
            var totalHeldForProject = await _context.Transactions
                .Where(x =>
                    x.UserId == expertProfile.UserId &&
                    x.ProjectId == project.ProjectId &&
                    x.Status == TransactionStatusSuccess &&
                    x.Type == TxExpertPendingEarningHold)
                .SumAsync(x => (decimal?)x.Amount) ?? 0m;

            var alreadyReleasedForProject = await _context.Transactions
                .Where(x =>
                    x.UserId == expertProfile.UserId &&
                    x.ProjectId == project.ProjectId &&
                    x.Status == TransactionStatusSuccess &&
                    x.Type == TxExpertPendingEarningRelease)
                .SumAsync(x => (decimal?)x.Amount) ?? 0m;

            var releaseAmount = totalHeldForProject - alreadyReleasedForProject;

            if (releaseAmount <= 0)
            {
                return;
            }

            var expertWallet = await GetOrCreateWalletAsync(expertProfile.UserId);

            if (expertWallet.PendingEarningsBalance < releaseAmount)
            {
                throw new InvalidOperationException("Expert pending earnings balance is insufficient for project completion release.");
            }

            expertWallet.PendingEarningsBalance -= releaseAmount;
            expertWallet.AvailableBalance += releaseAmount;
            expertWallet.UpdatedAt = DateTime.UtcNow;

            _context.Transactions.Add(new Transaction
            {
                UserId = expertProfile.UserId,
                ProjectId = project.ProjectId,
                Amount = releaseAmount,
                Type = TxExpertPendingEarningRelease,
                Status = TransactionStatusSuccess,
                Description = $"[Expert Pending Earning Release] Released held earnings for completed Project ID {project.ProjectId}",
                ReferenceId = $"PROJECT_{project.ProjectId}",
                CreatedAt = DateTime.UtcNow
            });
        }

        private static bool IsMilestoneFinished(Milestone milestone)
        {
            var status = milestone.Status?.Trim().ToUpperInvariant();
            var paymentStatus = milestone.PaymentStatus?.Trim().ToUpperInvariant();

            return status == MilestoneStatusApproved ||
                status == MilestoneStatusResolved ||
                status == MilestoneStatusDisputeResolved ||
                status == MilestoneStatusReleased ||
                status == MilestoneStatusRefunded ||
                paymentStatus == PaymentStatusReleased ||
                paymentStatus == PaymentStatusRefunded;
        }

        private async Task UpdateProjectStatusAfterResolutionAsync(
            Project project,
            int resolvedDisputeId)
        {
            var hasOpenDispute = await _context.Disputes.AnyAsync(d =>
                d.ProjectId == project.ProjectId &&
                d.DisputeId != resolvedDisputeId &&
                d.Status == DisputeStatusOpen);

            if (hasOpenDispute)
            {
                project.Status = ProjectStatusDisputed;

                await UpdateJobStatusByProjectAsync(
                    project,
                    JobStatusDisputed);

                return;
            }

            var milestones = await _context.Milestones
                .Where(m => m.ProjectId == project.ProjectId)
                .ToListAsync();

            if (milestones.Any() && milestones.All(IsMilestoneFinished))
            {
                project.Status = ProjectStatusCompleted;
                project.EndDate ??= DateTime.UtcNow;

                await UpdateJobStatusByProjectAsync(
                    project,
                    JobStatusCompleted);

                return;
            }

            project.Status = ProjectStatusActive;
            project.EndDate = null;

            await UpdateJobStatusByProjectAsync(
                project,
                JobStatusActive);
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
                PendingEarningsBalance = 0,
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

        private async Task UpdateJobStatusByProjectAsync(
            Project project,
            string jobStatus)
        {
            var contract = await _context.ProjectContracts
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ContractId == project.ContractId);

            if (contract == null)
            {
                return;
            }

            var proposal = await _context.Proposals
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProposalId == contract.ProposalId);

            if (proposal == null)
            {
                return;
            }

            var job = await _context.JobPostings
                .FirstOrDefaultAsync(x => x.JobPostingId == proposal.JobId);

            if (job == null)
            {
                return;
            }

            job.Status = jobStatus;
            job.UpdatedAt = DateTime.UtcNow;
        }

        private async Task ApplyLostDisputePolicyAsync(
            int loserUserId,
            int currentDisputeId)
        {
            var loser = await GetUserAsync(loserUserId);

            var lostCountBeforeCurrent = await CountResolvedLostDisputesAsync(
                loserUserId,
                currentDisputeId);

            var lostCountAfterCurrent = lostCountBeforeCurrent + 1;
            var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();
            var warningThreshold = workflowPolicy.DisputeLostWarningThreshold;

            if (warningThreshold <= 0 || lostCountAfterCurrent < warningThreshold)
            {
                return;
            }

            if (lostCountAfterCurrent == warningThreshold)
            {
                await _notificationService.CreateNotificationAsync(
                    loser.UserId,
                    "Dispute warning",
                    $"You have lost {warningThreshold} disputes. Please review your work quality, communication and contract compliance to avoid account restrictions.",
                    NotificationTypes.DisputeWarning);

                await NotifyAdminsUserDisputeRiskAsync(
                    loser,
                    lostCountAfterCurrent,
                    $"User has lost {warningThreshold} disputes and should be reviewed by Admin.");

                return;
            }

            if (lostCountAfterCurrent == warningThreshold + 1)
            {
                await _notificationService.CreateNotificationAsync(
                    loser.UserId,
                    "Serious dispute warning",
                    $"You have lost {warningThreshold + 1} disputes. Your account is at high risk of suspension if another dispute is lost.",
                    NotificationTypes.DisputeSeriousWarning);

                await NotifyAdminsUserDisputeRiskAsync(
                    loser,
                    lostCountAfterCurrent,
                    $"User has lost {warningThreshold + 1} disputes. Admin should consider suspension or manual review.");

                return;
            }

            if (lostCountAfterCurrent >= warningThreshold + 2)
            {
                if (!string.Equals(loser.Status, UserStatusBanned, StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(loser.Status, UserStatusSuspended, StringComparison.OrdinalIgnoreCase))
                {
                    loser.Status = UserStatusSuspended;
                    loser.UpdatedAt = DateTime.UtcNow;
                }

                await _notificationService.CreateNotificationAsync(
                    loser.UserId,
                    "Account suspended",
                    $"Your account has been automatically suspended because you lost {warningThreshold + 2} disputes. Please contact support or wait for Admin review.",
                    NotificationTypes.AccountAutoSuspended);

                await NotifyAdminsUserDisputeRiskAsync(
                    loser,
                    lostCountAfterCurrent,
                    $"User has lost {warningThreshold + 2} disputes and was automatically suspended by the system.");
            }
        }

        private async Task<int> CountResolvedLostDisputesAsync(
            int userId,
            int excludeDisputeId)
        {
            var lostCount = await
            (
                from dispute in _context.Disputes.AsNoTracking()
                join project in _context.Projects.AsNoTracking()
                    on dispute.ProjectId equals project.ProjectId
                join contract in _context.ProjectContracts.AsNoTracking()
                    on project.ContractId equals contract.ContractId
                join clientProfile in _context.ClientProfiles.AsNoTracking()
                    on contract.ClientId equals clientProfile.ClientProfileId
                join expertProfile in _context.ExpertProfiles.AsNoTracking()
                    on contract.ExpertId equals expertProfile.ExpertProfileId
                where dispute.DisputeId != excludeDisputeId
                    && dispute.Status == DisputeStatusResolved
                    && (
                            (
                                dispute.ResolutionType == ResolutionReleaseToExpert &&
                                clientProfile.UserId == userId
                            )
                            ||
                            (
                                dispute.ResolutionType == ResolutionRefundToClient &&
                                expertProfile.UserId == userId
                            )
                        )
                select dispute.DisputeId
            ).CountAsync();

            return lostCount;
        }

        private async Task NotifyAdminsUserDisputeRiskAsync(
            User loser,
            int lostCount,
            string adminMessage)
        {
            var adminUserIds = await _context.Users
                .AsNoTracking()
                .Where(x =>
                    x.Role == "ADMIN" &&
                    x.Status != UserStatusBanned)
                .Select(x => x.UserId)
                .ToListAsync();

            foreach (var adminUserId in adminUserIds)
            {
                await _notificationService.CreateNotificationAsync(
                    adminUserId,
                    "User dispute risk alert",
                    $"{adminMessage} UserId={loser.UserId}, Email={loser.Email}, LostDisputeCount={lostCount}.",
                    NotificationTypes.UserDisputeRisk);
            }
        }
    }
}