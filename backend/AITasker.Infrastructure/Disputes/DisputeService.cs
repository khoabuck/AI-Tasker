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
        private const string ProjectStatusCancelled = "CANCELLED";

        private const string ContractStatusConfirmed = "CONFIRMED";

        private const string JobStatusActive = "ACTIVE";
        private const string JobStatusDisputed = "DISPUTED";

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
        private const string UserStatusActive = "ACTIVE";

        private const string AutoDisputeSuspensionReason = "Auto suspended due to repeated lost disputes.";

        private const string TransactionStatusSuccess = "SUCCESS";
        private const string TxEscrowFreeze = "ESCROW_FREEZE";
        private const string TxEscrowRelease = "ESCROW_RELEASE";
        private const string TxExpertPendingEarningHold = "EXPERT_PENDING_EARNING_HOLD";
        private const string TxRefund = "REFUND";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;
        private readonly IExpertEarningEscrowService _expertEarningEscrowService;
        private readonly IProjectCompletionService _projectCompletionService;
        private readonly IExternalUrlValidator _externalUrlValidator;

        public DisputeService(
            AITaskerDbContext context,
            INotificationService notificationService,
            IMarketplaceWorkflowPolicyService workflowPolicyService,
            IExpertEarningEscrowService expertEarningEscrowService,
            IProjectCompletionService projectCompletionService,
            IExternalUrlValidator externalUrlValidator)
        {
            _context = context;
            _notificationService = notificationService;
            _workflowPolicyService = workflowPolicyService;
            _expertEarningEscrowService = expertEarningEscrowService;
            _projectCompletionService = projectCompletionService;
            _externalUrlValidator = externalUrlValidator;
        }

        public async Task<DisputeResponse> OpenDisputeAsync(
            int currentUserId,
            OpenDisputeRequest request)
        {
            ValidateOpenRequest(request);

            var evidenceFileUrl = await _externalUrlValidator.ValidateOptionalUrlAsync(
                request.EvidenceFileUrl,
                nameof(request.EvidenceFileUrl),
                maxLength: 500);

            var evidenceImageUrl = await _externalUrlValidator.ValidateOptionalUrlAsync(
                request.EvidenceImageUrl,
                nameof(request.EvidenceImageUrl),
                maxLength: 1000,
                requireImage: true);

            var uploadedImageUrls = await ValidateImageUrlListAsync(
                NormalizeUrlList(request.EvidenceImageUrls),
                nameof(request.EvidenceImageUrls));

            var openedDisputeId = 0;
            var notificationRespondentUserId = 0;
            var notificationProjectId = 0;
            int? notificationMilestoneId = null;
            var notificationProjectTitle = string.Empty;
            var notificationOpenerName = string.Empty;
            var notificationRespondentName = string.Empty;

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
                Deliverable? disputedDeliverable = null;
                Escrow? escrow = null;

                if (request.MilestoneId.HasValue)
                {
                    milestone = await GetMilestoneAsync(request.MilestoneId.Value);

                    if (milestone.ProjectId != project.ProjectId)
                    {
                        throw new InvalidOperationException("Milestone does not belong to this project.");
                    }

                    disputedDeliverable = await ResolveDisputedDeliverableAsync(
                        request.DeliverableId,
                        milestone.MilestoneId);

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
                    if (request.DeliverableId.HasValue)
                    {
                        throw new InvalidOperationException(
                            "DeliverableId can only be provided for a milestone-level dispute.");
                    }

                    var lockedEscrows = await _context.Escrows
                        .Where(e =>
                            e.ProjectId == project.ProjectId &&
                            e.Status == EscrowStatusLocked)
                        .ToListAsync();

                    var lockedAmount = lockedEscrows.Sum(e => e.Amount);
                    var pendingEarningsAmount = await _expertEarningEscrowService
                        .GetPendingEarningsForProjectAsync(project.ProjectId, expertProfile.UserId);
                    var totalDisputableAmount = lockedAmount + pendingEarningsAmount;

                    if (totalDisputableAmount <= 0)
                    {
                        throw new InvalidOperationException("No locked escrow or expert pending earnings found for project-level dispute.");
                    }

                    if (request.DisputedAmount != totalDisputableAmount)
                    {
                        throw new InvalidOperationException(
                            $"Project-level dispute amount must equal total disputable amount ({totalDisputableAmount}). This includes locked escrow and expert pending earnings.");
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
                    DeliverableId = disputedDeliverable?.DeliverableId,
                    OpenedByUserId = currentUserId,
                    RespondentUserId = respondentUserId,
                    Reason = request.Reason.Trim(),
                    DisputedAmount = request.DisputedAmount,
                    Status = DisputeStatusOpen,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Disputes.Add(dispute);
                await _context.SaveChangesAsync();

                var evidenceText = string.IsNullOrWhiteSpace(request.EvidenceText)
                    ? request.Reason.Trim()
                    : request.EvidenceText.Trim();

                if (!string.IsNullOrWhiteSpace(evidenceText) ||
                    !string.IsNullOrWhiteSpace(evidenceFileUrl) ||
                    !string.IsNullOrWhiteSpace(evidenceImageUrl))
                {
                    _context.DisputeEvidences.Add(new DisputeEvidence
                    {
                        DisputeId = dispute.DisputeId,
                        UploadedByUserId = currentUserId,
                        EvidenceText = string.IsNullOrWhiteSpace(evidenceText)
                            ? "Initial dispute evidence submitted."
                            : evidenceText,
                        FileUrl = evidenceFileUrl,
                        ImageUrl = evidenceImageUrl,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                foreach (var uploadedImageUrl in uploadedImageUrls)
                {
                    _context.DisputeEvidences.Add(new DisputeEvidence
                    {
                        DisputeId = dispute.DisputeId,
                        UploadedByUserId = currentUserId,
                        EvidenceText = string.IsNullOrWhiteSpace(evidenceText)
                            ? "Image evidence submitted."
                            : evidenceText,
                        ImageUrl = uploadedImageUrl,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                if (!string.IsNullOrWhiteSpace(evidenceText) ||
                    !string.IsNullOrWhiteSpace(evidenceFileUrl) ||
                    !string.IsNullOrWhiteSpace(evidenceImageUrl) ||
                    uploadedImageUrls.Count > 0)
                {
                    await _context.SaveChangesAsync();
                }

                openedDisputeId = dispute.DisputeId;
                notificationRespondentUserId = respondentUserId;
                notificationProjectId = dispute.ProjectId;
                notificationMilestoneId = dispute.MilestoneId;
                notificationProjectTitle = project.Title;
                notificationOpenerName = currentUserIsClient
                    ? clientUser.FullName
                    : expertUser.FullName;
                notificationRespondentName = currentUserIsClient
                    ? expertUser.FullName
                    : clientUser.FullName;

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            await _notificationService.CreateNotificationAsync(
                notificationRespondentUserId,
                "Dispute opened",
                $"{notificationOpenerName} opened a dispute in project '{notificationProjectTitle}'.",
                "DISPUTE_OPENED",
                relatedEntityType: "DISPUTE",
                relatedEntityId: openedDisputeId,
                relatedProjectId: notificationProjectId,
                relatedMilestoneId: notificationMilestoneId,
                relatedDisputeId: openedDisputeId);

            await NotifyAdminsAsync(
                "New dispute opened",
                $"A dispute was opened in project '{notificationProjectTitle}' by {notificationOpenerName} against {notificationRespondentName}.",
                "DISPUTE_OPENED");

            return await MapToDisputeResponseAsync(openedDisputeId);
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

            var fileUrl = await _externalUrlValidator.ValidateOptionalUrlAsync(
                request.FileUrl,
                nameof(request.FileUrl),
                maxLength: 500);

            var imageUrl = await _externalUrlValidator.ValidateOptionalUrlAsync(
                request.ImageUrl,
                nameof(request.ImageUrl),
                maxLength: 1000,
                requireImage: true);

            var imageUrls = await ValidateImageUrlListAsync(
                NormalizeUrlList(request.ImageUrls),
                nameof(request.ImageUrls));

            var dispute = await GetDisputeAsync(disputeId);
            await EnsureCanAccessDisputeAsync(currentUserId, dispute);

            if (!string.Equals(dispute.Status, DisputeStatusOpen, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Evidence can only be added to OPEN disputes.");
            }

            var evidenceText = string.IsNullOrWhiteSpace(request.EvidenceText)
                ? "Evidence attachment submitted."
                : request.EvidenceText.Trim();

            if (!string.IsNullOrWhiteSpace(fileUrl) ||
                !string.IsNullOrWhiteSpace(imageUrl))
            {
                _context.DisputeEvidences.Add(new DisputeEvidence
                {
                    DisputeId = dispute.DisputeId,
                    UploadedByUserId = currentUserId,
                    EvidenceText = evidenceText,
                    FileUrl = fileUrl,
                    ImageUrl = imageUrl,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else if (!string.IsNullOrWhiteSpace(request.EvidenceText))
            {
                _context.DisputeEvidences.Add(new DisputeEvidence
                {
                    DisputeId = dispute.DisputeId,
                    UploadedByUserId = currentUserId,
                    EvidenceText = request.EvidenceText.Trim(),
                    CreatedAt = DateTime.UtcNow
                });
            }

            foreach (var uploadedImageUrl in imageUrls)
            {
                _context.DisputeEvidences.Add(new DisputeEvidence
                {
                    DisputeId = dispute.DisputeId,
                    UploadedByUserId = currentUserId,
                    EvidenceText = evidenceText,
                    ImageUrl = uploadedImageUrl,
                    CreatedAt = DateTime.UtcNow
                });
            }

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

            var resolvedDisputeId = 0;
            var notificationClientUserId = 0;
            var notificationExpertUserId = 0;
            var notificationProjectId = 0;
            int? notificationMilestoneId = null;
            var notificationClientAmount = 0m;
            var notificationExpertAmount = 0m;
            var completedProject = false;
            var completedProjectTitle = string.Empty;
            var completedContractId = 0;
            var completedProposalId = 0;

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

                    var projectEscrowTotal = projectEscrows.Sum(e => e.Amount);
                    var pendingEarningsAmount = await _expertEarningEscrowService
                        .GetPendingEarningsForProjectAsync(project.ProjectId, expertProfile.UserId);
                    var totalDisputableAmount = projectEscrowTotal + pendingEarningsAmount;

                    if (totalDisputableAmount <= 0)
                    {
                        throw new InvalidOperationException("Frozen escrows or expert pending earnings not found for project-level dispute.");
                    }

                    if (dispute.DisputedAmount != totalDisputableAmount)
                    {
                        throw new InvalidOperationException("Project-level dispute amount must equal total frozen escrow plus expert pending earnings before resolution.");
                    }
                }

                var clientWallet = await GetOrCreateWalletAsync(clientProfile.UserId);
                var expertWallet = await GetOrCreateWalletAsync(expertProfile.UserId);

                var lockedDisputedAmount = escrow?.Amount ?? projectEscrows.Sum(x => x.Amount);
                var pendingDisputedAmount = dispute.MilestoneId.HasValue
                    ? 0m
                    : await _expertEarningEscrowService.GetPendingEarningsForProjectAsync(
                        project.ProjectId,
                        expertProfile.UserId);

                if (clientWallet.LockedBalance < lockedDisputedAmount)
                {
                    throw new InvalidOperationException("Client locked balance is insufficient for dispute resolution.");
                }

                if (lockedDisputedAmount > 0)
                {
                    clientWallet.LockedBalance -= lockedDisputedAmount;
                    clientWallet.UpdatedAt = DateTime.UtcNow;
                }

                var referenceId = dispute.MilestoneId.HasValue
                    ? $"MILESTONE_{dispute.MilestoneId.Value}"
                    : $"DISPUTE_{dispute.DisputeId}";

                if (normalizedResolutionType == ResolutionRefundToClient)
                {
                    if (lockedDisputedAmount > 0)
                    {
                        clientWallet.AvailableBalance += lockedDisputedAmount;
                        clientWallet.UpdatedAt = DateTime.UtcNow;

                        _context.Transactions.Add(new Transaction
                        {
                            UserId = clientProfile.UserId,
                            ProjectId = project.ProjectId,
                            MilestoneId = dispute.MilestoneId,
                            EscrowId = escrow?.EscrowId,
                            Amount = lockedDisputedAmount,
                            Type = TxRefund,
                            Status = TransactionStatusSuccess,
                            Description = $"[Dispute Resolution] Client refund from locked escrow in Dispute ID {dispute.DisputeId}",
                            ReferenceId = referenceId,
                            CreatedAt = DateTime.UtcNow
                        });
                    }

                    if (pendingDisputedAmount > 0)
                    {
                        await _expertEarningEscrowService.RefundProjectPendingEarningsToClientAsync(
                            project,
                            expertProfile,
                            clientProfile,
                            dispute.DisputeId);
                    }
                }

                if (normalizedResolutionType == ResolutionReleaseToExpert && lockedDisputedAmount > 0)
                {
                    expertWallet.PendingEarningsBalance += lockedDisputedAmount;
                    expertWallet.TotalEarning += lockedDisputedAmount;
                    expertWallet.UpdatedAt = DateTime.UtcNow;

                    _context.Transactions.Add(new Transaction
                    {
                        UserId = expertProfile.UserId,
                        ProjectId = project.ProjectId,
                        MilestoneId = dispute.MilestoneId,
                        EscrowId = escrow?.EscrowId,
                        Amount = lockedDisputedAmount,
                        Type = TxExpertPendingEarningHold,
                        Status = TransactionStatusSuccess,
                        Description = $"[Dispute Resolution] Expert earning held from locked escrow in Dispute ID {dispute.DisputeId} until project completion",
                        ReferenceId = referenceId,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                clientAmount = normalizedResolutionType == ResolutionRefundToClient
                    ? lockedDisputedAmount + pendingDisputedAmount
                    : 0m;

                expertAmount = normalizedResolutionType == ResolutionReleaseToExpert
                    ? lockedDisputedAmount + pendingDisputedAmount
                    : 0m;

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

                        await MarkDisputedDeliverableAfterResolutionAsync(
                            dispute,
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

                    await MarkDisputedDeliverableAfterResolutionAsync(
                        dispute,
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

                await _context.SaveChangesAsync();

                completedProject = await _projectCompletionService.TryCompleteProjectAsync(
                    project.ProjectId,
                    sendNotifications: false);

                resolvedDisputeId = dispute.DisputeId;
                notificationClientUserId = clientProfile.UserId;
                notificationExpertUserId = expertProfile.UserId;
                notificationProjectId = dispute.ProjectId;
                notificationMilestoneId = dispute.MilestoneId;
                notificationClientAmount = clientAmount;
                notificationExpertAmount = expertAmount;
                completedProjectTitle = project.Title;
                completedContractId = contract.ContractId;
                completedProposalId = contract.ProposalId;

                await dbTransaction.CommitAsync();
            }
            catch
            {
                await dbTransaction.RollbackAsync();
                throw;
            }

            var resolutionMessage =
                $"Dispute #{resolvedDisputeId} has been resolved. Client receives {notificationClientAmount}, Expert receives {notificationExpertAmount}.";

            await _notificationService.CreateNotificationAsync(
                notificationClientUserId,
                "Dispute resolved",
                resolutionMessage,
                "DISPUTE_RESOLVED",
                relatedEntityType: "DISPUTE",
                relatedEntityId: resolvedDisputeId,
                relatedProjectId: notificationProjectId,
                relatedMilestoneId: notificationMilestoneId,
                relatedDisputeId: resolvedDisputeId);

            await _notificationService.CreateNotificationAsync(
                notificationExpertUserId,
                "Dispute resolved",
                resolutionMessage,
                "DISPUTE_RESOLVED",
                relatedEntityType: "DISPUTE",
                relatedEntityId: resolvedDisputeId,
                relatedProjectId: notificationProjectId,
                relatedMilestoneId: notificationMilestoneId,
                relatedDisputeId: resolvedDisputeId);

            if (completedProject)
            {
                var proposal = await _context.Proposals
                    .AsNoTracking()
                    .FirstAsync(x => x.ProposalId == completedProposalId);

                await _notificationService.CreateNotificationAsync(
                    notificationClientUserId,
                    "Project completed",
                    $"Project '{completedProjectTitle}' has been completed.",
                    "PROJECT_COMPLETED",
                    relatedEntityType: "PROJECT",
                    relatedEntityId: notificationProjectId,
                    relatedJobId: proposal.JobId,
                    relatedProposalId: completedProposalId,
                    relatedContractId: completedContractId,
                    relatedProjectId: notificationProjectId);

                await _notificationService.CreateNotificationAsync(
                    notificationExpertUserId,
                    "Project completed",
                    $"Project '{completedProjectTitle}' has been completed.",
                    "PROJECT_COMPLETED",
                    relatedEntityType: "PROJECT",
                    relatedEntityId: notificationProjectId,
                    relatedJobId: proposal.JobId,
                    relatedProposalId: completedProposalId,
                    relatedContractId: completedContractId,
                    relatedProjectId: notificationProjectId);
            }

            return await MapToDisputeResponseAsync(resolvedDisputeId);
        }

        /// <summary>
        /// Updates the exact deliverable version captured when the dispute was opened.
        /// Legacy disputes without a captured deliverable fall back to the latest submitted version.
        /// </summary>
        private async Task MarkDisputedDeliverableAfterResolutionAsync(
            Dispute dispute,
            int milestoneId,
            string normalizedResolutionType)
        {
            Deliverable? deliverable = null;

            if (dispute.DeliverableId.HasValue)
            {
                deliverable = await _context.Deliverables
                    .FirstOrDefaultAsync(d =>
                        d.DeliverableId == dispute.DeliverableId.Value &&
                        d.MilestoneId == milestoneId);
            }

            deliverable ??= await _context.Deliverables
                .Where(d =>
                    d.MilestoneId == milestoneId &&
                    d.Status == DeliverableStatusSubmitted)
                .OrderByDescending(d => d.VersionNumber)
                .FirstOrDefaultAsync();

            if (deliverable == null)
            {
                return;
            }

            deliverable.ReviewedAt ??= DateTime.UtcNow;

            if (normalizedResolutionType == ResolutionReleaseToExpert)
            {
                deliverable.Status = DeliverableStatusApproved;
                deliverable.ClientFeedback = null;
            }
            else if (normalizedResolutionType == ResolutionRefundToClient)
            {
                deliverable.ClientFeedback = "Dispute resolved with refund to Client.";
            }
        }

        /// <summary>
        /// Resolves and snapshots the deliverable version connected to a milestone dispute.
        /// </summary>
        private async Task<Deliverable?> ResolveDisputedDeliverableAsync(
            int? deliverableId,
            int milestoneId)
        {
            if (deliverableId.HasValue)
            {
                var selectedDeliverable = await _context.Deliverables
                    .FirstOrDefaultAsync(d => d.DeliverableId == deliverableId.Value);

                if (selectedDeliverable == null)
                {
                    throw new InvalidOperationException("Deliverable not found.");
                }

                if (selectedDeliverable.MilestoneId != milestoneId)
                {
                    throw new InvalidOperationException(
                        "Deliverable does not belong to the selected milestone.");
                }

                return selectedDeliverable;
            }

            return await _context.Deliverables
                .Where(d => d.MilestoneId == milestoneId)
                .OrderByDescending(d => d.VersionNumber)
                .FirstOrDefaultAsync();
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

            if (request.DeliverableId.HasValue && request.DeliverableId.Value <= 0)
            {
                throw new InvalidOperationException("DeliverableId must be greater than 0 when provided.");
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
                string.IsNullOrWhiteSpace(request.FileUrl) &&
                string.IsNullOrWhiteSpace(request.ImageUrl) &&
                (request.ImageUrls == null || request.ImageUrls.Count == 0))
            {
                throw new InvalidOperationException("Evidence text, file URL or image evidence is required.");
            }
        }

        private async Task<List<string>> ValidateImageUrlListAsync(
            List<string> urls,
            string fieldName)
        {
            var normalized = new List<string>();

            foreach (var url in urls)
            {
                var checkedUrl = await _externalUrlValidator.ValidateOptionalUrlAsync(
                    url,
                    fieldName,
                    maxLength: 1000,
                    requireImage: true);

                if (!string.IsNullOrWhiteSpace(checkedUrl))
                {
                    normalized.Add(checkedUrl);
                }
            }

            return normalized;
        }

        private static List<string> NormalizeUrlList(IEnumerable<string>? values)
        {
            if (values == null)
            {
                return new List<string>();
            }

            return values
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
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

            // Do not mark the project/job as COMPLETED here.
            // The centralized ProjectCompletionService must be the only place that completes
            // projects, releases pending earnings and sends project-completed notifications.
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

            var disputedDeliverable = dispute.DeliverableId.HasValue
                ? await _context.Deliverables
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.DeliverableId == dispute.DeliverableId.Value)
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
                    ImageUrl = evidence.ImageUrl,
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
                DeliverableId = dispute.DeliverableId,
                DeliverableVersionNumber = dispute.Deliverable?.VersionNumber,
                DeliverableStatus = disputedDeliverable?.Status,

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
                var now = DateTime.UtcNow;

                if (!string.Equals(loser.Status, UserStatusBanned, StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(loser.Status, UserStatusSuspended, StringComparison.OrdinalIgnoreCase))
                {
                    loser.StatusBeforeSuspension = string.IsNullOrWhiteSpace(loser.Status)
                        ? UserStatusActive
                        : loser.Status;
                    loser.Status = UserStatusSuspended;
                    loser.LockoutCount += 1;
                    loser.LastLockedAt = now;
                    loser.LockoutEnd = null;
                    loser.LockReason = $"{AutoDisputeSuspensionReason} Lost disputes: {lostCountAfterCurrent}. Threshold: {warningThreshold}.";
                    loser.UpdatedAt = now;
                }
                else if (string.Equals(loser.Status, UserStatusSuspended, StringComparison.OrdinalIgnoreCase))
                {
                    loser.StatusBeforeSuspension = string.IsNullOrWhiteSpace(loser.StatusBeforeSuspension)
                        ? UserStatusActive
                        : loser.StatusBeforeSuspension;
                    loser.LockReason = string.IsNullOrWhiteSpace(loser.LockReason)
                        ? $"{AutoDisputeSuspensionReason} Lost disputes: {lostCountAfterCurrent}. Threshold: {warningThreshold}."
                        : loser.LockReason;
                    loser.LastLockedAt ??= now;
                    loser.UpdatedAt = now;
                }

                await _notificationService.CreateNotificationAsync(
                    loser.UserId,
                    "Account suspended",
                    $"Your account has been automatically suspended because you lost {lostCountAfterCurrent} disputes. Please contact support or wait for Admin review.",
                    NotificationTypes.AccountAutoSuspended);

                await NotifyAdminsUserDisputeRiskAsync(
                    loser,
                    lostCountAfterCurrent,
                    $"User has lost {lostCountAfterCurrent} disputes and was automatically suspended by the system.");
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