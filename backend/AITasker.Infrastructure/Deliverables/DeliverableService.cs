using System.Data;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Deliverables
{
    public class DeliverableService : IDeliverableService
    {
        private const string JobStatusCompleted = "COMPLETED";

        private const string ProjectStatusActive = "ACTIVE";
        private const string ProjectStatusCompleted = "COMPLETED";

        private const string MilestoneStatusFunded = "FUNDED";
        private const string MilestoneStatusInProgress = "IN_PROGRESS";
        private const string MilestoneStatusOverdue = "OVERDUE";
        private const string MilestoneStatusSubmitted = "SUBMITTED";
        private const string MilestoneStatusRevisionRequested = "REVISION_REQUESTED";
        private const string MilestoneStatusApproved = "APPROVED";
        private const string MilestoneStatusResolved = "RESOLVED";
        private const string MilestoneStatusDisputeResolved = "DISPUTE_RESOLVED";
        private const string MilestoneStatusReleased = "RELEASED";
        private const string MilestoneStatusRefunded = "REFUNDED";
        private const string MilestoneStatusDisputed = "DISPUTED";

        private const string PaymentStatusLocked = "LOCKED";
        private const string PaymentStatusReleased = "RELEASED";

        private const string DeliverableStatusSubmitted = "SUBMITTED";
        private const string DeliverableStatusApproved = "APPROVED";
        private const string DeliverableStatusAutoApproved = "AUTO_APPROVED";
        private const string DeliverableStatusRevisionRequested = "REVISION_REQUESTED";

        private const string ArtifactAccessPublic = "PUBLIC";
        private const string ArtifactAccessRestricted = "RESTRICTED";
        private const string ArtifactValidationValid = "VALID";
        private const string ArtifactValidationAuthRequired = "AUTH_REQUIRED";

        private static readonly HashSet<string> AllowedArtifactTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "FILE",
            "FOLDER",
            "ARCHIVE",
            "SOURCE_REPOSITORY",
            "DOCUMENTATION",
            "DESIGN",
            "DATASET",
            "MODEL",
            "BUILD",
            "OTHER"
        };

        private readonly AITaskerDbContext _context;
        private readonly IWalletService _walletService;
        private readonly INotificationService _notificationService;
        private readonly IMarketplaceWorkflowPolicyService _workflowPolicyService;
        private readonly IProjectCompletionService _projectCompletionService;
        private readonly IExternalUrlValidator _externalUrlValidator;

        public DeliverableService(
            AITaskerDbContext context,
            IWalletService walletService,
            INotificationService notificationService,
            IMarketplaceWorkflowPolicyService workflowPolicyService,
            IProjectCompletionService projectCompletionService,
            IExternalUrlValidator externalUrlValidator)
        {
            _context = context;
            _walletService = walletService;
            _notificationService = notificationService;
            _workflowPolicyService = workflowPolicyService;
            _projectCompletionService = projectCompletionService;
            _externalUrlValidator = externalUrlValidator;
        }

        public async Task<DeliverableResponse> SubmitDeliverableAsync(
            int expertUserId,
            SubmitDeliverableRequest request)
        {
            ValidateSubmitRequest(request);

            var milestone = await GetMilestoneAsync(request.MilestoneId);
            var project = await GetProjectAsync(milestone.ProjectId);
            var contract = await GetContractAsync(project.ContractId);
            var clientProfile = await GetClientProfileAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

            if (expertProfile.UserId != expertUserId)
            {
                throw new UnauthorizedAccessException("Only the assigned expert can submit deliverables for this milestone.");
            }

            EnsureProjectEscrowLockedForDeliverableAction(project, milestone);

            if (!CanSubmitForMilestone(milestone))
            {
                throw new InvalidOperationException(
                    "Deliverable can only be submitted for FUNDED, IN_PROGRESS, OVERDUE, or REVISION_REQUESTED milestones.");
            }

            var workflowPolicy = await _workflowPolicyService.GetActivePolicyAsync();
            var validatedDelivery = await ValidateAndNormalizeDeliveryAsync(
                request,
                workflowPolicy.DeliverableArtifactLimit);

            Deliverable deliverable;

            await using (var dbTransaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable))
            {
                try
                {
                    await _context.Entry(milestone).ReloadAsync();

                    EnsureProjectEscrowLockedForDeliverableAction(project, milestone);

                    if (!CanSubmitForMilestone(milestone))
                    {
                        throw new InvalidOperationException(
                            "Milestone state changed and it no longer accepts a deliverable submission.");
                    }

                    var hasPendingSubmittedDeliverable = await _context.Deliverables.AnyAsync(d =>
                        d.MilestoneId == milestone.MilestoneId &&
                        d.Status == DeliverableStatusSubmitted);

                    if (hasPendingSubmittedDeliverable)
                    {
                        throw new InvalidOperationException("This milestone already has a submitted deliverable waiting for Client review.");
                    }

                    var latestVersion = await _context.Deliverables
                        .Where(d => d.MilestoneId == milestone.MilestoneId)
                        .MaxAsync(d => (int?)d.VersionNumber) ?? 0;

                    var now = DateTime.UtcNow;

                    deliverable = new Deliverable
                    {
                        MilestoneId = milestone.MilestoneId,
                        ExpertId = expertProfile.ExpertProfileId,
                        FileUrl = validatedDelivery.Artifacts.FirstOrDefault()?.Url,
                        DemoUrl = validatedDelivery.DemoUrl,
                        DemoInstructions = NormalizeOptionalText(request.DemoInstructions),
                        DemoValidationStatus = validatedDelivery.DemoUrl == null
                            ? null
                            : ArtifactValidationValid,
                        Description = request.Description.Trim(),
                        HandoverNotes = NormalizeOptionalText(request.HandoverNotes),
                        TestResultUrl = validatedDelivery.TestResultUrl,
                        TestSummary = NormalizeOptionalText(request.TestSummary),
                        TestValidationStatus = validatedDelivery.TestResultUrl == null
                            ? null
                            : ArtifactValidationValid,
                        ClientFeedback = null,
                        VersionNumber = latestVersion + 1,
                        Status = DeliverableStatusSubmitted,
                        SubmittedAt = now,
                        ReviewDeadlineAt = now.AddHours(workflowPolicy.DeliverableReviewWindowHours),
                        ReviewedAt = null,
                        OverdueNotifiedAt = null
                    };

                    foreach (var artifact in validatedDelivery.Artifacts)
                    {
                        deliverable.Artifacts.Add(new DeliverableArtifact
                        {
                            ArtifactType = artifact.ArtifactType,
                            Label = artifact.Label,
                            Url = artifact.Url,
                            Provider = artifact.Provider,
                            AccessLevel = artifact.AccessLevel,
                            Version = artifact.Version,
                            CommitHash = artifact.CommitHash,
                            Checksum = artifact.Checksum,
                            ValidationStatus = artifact.ValidationStatus,
                            ValidatedAt = artifact.ValidatedAt,
                            CreatedAt = now
                        });
                    }

                    milestone.Status = MilestoneStatusSubmitted;
                    _context.Deliverables.Add(deliverable);

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            }

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Deliverable submitted",
                $"Expert submitted deliverable v{deliverable.VersionNumber} for milestone '{milestone.Title}'. Please review before {deliverable.ReviewDeadlineAt:yyyy-MM-dd HH:mm:ss} UTC.",
                "DELIVERABLE_SUBMITTED",
                relatedEntityType: "DELIVERABLE",
                relatedEntityId: deliverable.DeliverableId,
                relatedProjectId: project.ProjectId,
                relatedMilestoneId: milestone.MilestoneId,
                relatedDeliverableId: deliverable.DeliverableId);

            return await MapToDeliverableResponseAsync(deliverable);
        }

        public async Task<IReadOnlyList<DeliverableResponse>> GetMilestoneDeliverablesAsync(
            int currentUserId,
            int milestoneId)
        {
            var milestone = await GetMilestoneAsync(milestoneId);
            var project = await GetProjectAsync(milestone.ProjectId);
            var contract = await GetContractAsync(project.ContractId);
            var clientProfile = await GetClientProfileAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

            await EnsureUserCanAccessDeliverableContextAsync(
                currentUserId,
                clientProfile,
                expertProfile);

            var deliverables = await _context.Deliverables
                .AsNoTracking()
                .Where(d => d.MilestoneId == milestoneId)
                .OrderByDescending(d => d.VersionNumber)
                .ToListAsync();

            var responses = new List<DeliverableResponse>();

            foreach (var deliverable in deliverables)
            {
                responses.Add(await MapToDeliverableResponseAsync(deliverable));
            }

            return responses;
        }

        public async Task<DeliverableResponse> GetDeliverableByIdAsync(
            int currentUserId,
            int deliverableId)
        {
            var deliverable = await GetDeliverableAsync(deliverableId);
            var milestone = await GetMilestoneAsync(deliverable.MilestoneId);
            var project = await GetProjectAsync(milestone.ProjectId);
            var contract = await GetContractAsync(project.ContractId);
            var clientProfile = await GetClientProfileAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

            await EnsureUserCanAccessDeliverableContextAsync(
                currentUserId,
                clientProfile,
                expertProfile);

            return await MapToDeliverableResponseAsync(deliverable);
        }

        public async Task<DeliverableResponse> ApproveDeliverableAsync(
            int deliverableId,
            int clientUserId)
        {
            var deliverable = await GetDeliverableAsync(deliverableId);

            if (!string.Equals(deliverable.Status, DeliverableStatusSubmitted, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Only SUBMITTED deliverables can be approved.");
            }

            var milestone = await GetMilestoneAsync(deliverable.MilestoneId);
            var project = await GetProjectAsync(milestone.ProjectId);
            var contract = await GetContractAsync(project.ContractId);
            var clientProfile = await GetClientProfileAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

            if (clientProfile.UserId != clientUserId)
            {
                throw new UnauthorizedAccessException("Only the project Client can approve this deliverable.");
            }

            EnsureProjectEscrowLockedForDeliverableAction(project, milestone);

            if (!string.Equals(milestone.Status, MilestoneStatusSubmitted, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Milestone must be SUBMITTED before approving deliverable.");
            }

            deliverable.ReviewedAt = DateTime.UtcNow;
            deliverable.ClientFeedback = null;

            var escrowResult = await _walletService.ReleaseEscrowAsync(
                clientUserId,
                milestone.MilestoneId);

            if (!escrowResult.Success)
            {
                throw new InvalidOperationException("Failed to release escrow funds.");
            }

            await TryCompleteProjectAfterApprovalAsync(project.ProjectId);

            await _notificationService.CreateNotificationAsync(
                expertProfile.UserId,
                "Deliverable approved",
                $"Your deliverable for milestone '{milestone.Title}' was approved and escrow was released.",
                "DELIVERABLE_APPROVED",
                relatedEntityType: "DELIVERABLE",
                relatedEntityId: deliverable.DeliverableId,
                relatedProjectId: project.ProjectId,
                relatedMilestoneId: milestone.MilestoneId,
                relatedDeliverableId: deliverable.DeliverableId);

            await _notificationService.CreateNotificationAsync(
                clientProfile.UserId,
                "Deliverable approved",
                $"You approved deliverable v{deliverable.VersionNumber} for milestone '{milestone.Title}'.",
                "DELIVERABLE_APPROVED",
                relatedEntityType: "DELIVERABLE",
                relatedEntityId: deliverable.DeliverableId,
                relatedProjectId: project.ProjectId,
                relatedMilestoneId: milestone.MilestoneId,
                relatedDeliverableId: deliverable.DeliverableId);

            return await MapToDeliverableResponseAsync(deliverable);
        }

        public async Task<DeliverableResponse> RequestRevisionAsync(
            int deliverableId,
            int clientUserId,
            RevisionRequest request)
        {
            ValidateRevisionRequest(request);

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var deliverable = await GetDeliverableAsync(deliverableId);

                if (!string.Equals(deliverable.Status, DeliverableStatusSubmitted, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Only SUBMITTED deliverables can be sent back for revision.");
                }

                var milestone = await GetMilestoneAsync(deliverable.MilestoneId);
                var project = await GetProjectAsync(milestone.ProjectId);
                var contract = await GetContractAsync(project.ContractId);
                var clientProfile = await GetClientProfileAsync(contract.ClientId);
                var expertProfile = await GetExpertProfileAsync(contract.ExpertId);

                if (clientProfile.UserId != clientUserId)
                {
                    throw new UnauthorizedAccessException("Only the project Client can request revision.");
                }

                EnsureProjectEscrowLockedForDeliverableAction(project, milestone);

                if (!string.Equals(milestone.Status, MilestoneStatusSubmitted, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        "Milestone must be SUBMITTED before requesting revision.");
                }

                deliverable.Status = DeliverableStatusRevisionRequested;

                deliverable.ClientFeedback = request.Feedback.Trim();
                deliverable.ReviewedAt = DateTime.UtcNow;
                milestone.Status = MilestoneStatusRevisionRequested;
                milestone.RevisionUsed += 1;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                await _notificationService.CreateNotificationAsync(
                    expertProfile.UserId,
                    "Revision requested",
                    $"Client requested revision for milestone '{milestone.Title}'. Feedback: {request.Feedback.Trim()}",
                    "REVISION_REQUESTED",
                    relatedEntityType: "DELIVERABLE",
                    relatedEntityId: deliverable.DeliverableId,
                    relatedProjectId: project.ProjectId,
                    relatedMilestoneId: milestone.MilestoneId,
                    relatedDeliverableId: deliverable.DeliverableId);

                return await MapToDeliverableResponseAsync(deliverable);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        /// <summary>
        /// Validates fields that do not require network access before the deliverable is created.
        /// Product handover must include at least one artifact; DemoUrl is supplementary only.
        /// </summary>
        private static void ValidateSubmitRequest(SubmitDeliverableRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Deliverable request is required.");
            }

            if (request.MilestoneId <= 0)
            {
                throw new InvalidOperationException("MilestoneId is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Description))
            {
                throw new InvalidOperationException("Deliverable description is required.");
            }

            if (request.Description.Trim().Length > 4000)
            {
                throw new InvalidOperationException("Deliverable description must not exceed 4000 characters.");
            }

            if (!string.IsNullOrWhiteSpace(request.HandoverNotes) &&
                request.HandoverNotes.Trim().Length > 4000)
            {
                throw new InvalidOperationException("HandoverNotes must not exceed 4000 characters.");
            }

            if (!string.IsNullOrWhiteSpace(request.DemoInstructions) &&
                request.DemoInstructions.Trim().Length > 2000)
            {
                throw new InvalidOperationException("DemoInstructions must not exceed 2000 characters.");
            }

            if (!string.IsNullOrWhiteSpace(request.TestSummary) &&
                request.TestSummary.Trim().Length > 2000)
            {
                throw new InvalidOperationException("TestSummary must not exceed 2000 characters.");
            }

            var hasLegacyFileUrl = !string.IsNullOrWhiteSpace(request.FileUrl);
            var hasArtifacts = request.Artifacts?.Count > 0;

            if (!hasLegacyFileUrl && !hasArtifacts)
            {
                throw new InvalidOperationException(
                    "At least one product artifact is required. DemoUrl cannot replace the delivered product.");
            }

            if (!string.IsNullOrWhiteSpace(request.TestResultUrl) &&
                string.IsNullOrWhiteSpace(request.TestSummary))
            {
                throw new InvalidOperationException(
                    "TestSummary is required when TestResultUrl is provided.");
            }
        }

        /// <summary>
        /// Normalizes product artifacts and validates every external URL before any deliverable data is saved.
        /// Restricted artifacts are validated for safe URL structure but may require account-based access.
        /// </summary>
        private async Task<ValidatedDeliveryData> ValidateAndNormalizeDeliveryAsync(
            SubmitDeliverableRequest request,
            int artifactLimit)
        {
            var artifactRequests = request.Artifacts?
                .Where(x => x != null)
                .ToList() ?? new List<DeliverableArtifactRequest>();

            if (!string.IsNullOrWhiteSpace(request.FileUrl) &&
                !artifactRequests.Any(x => string.Equals(
                    x.Url?.Trim(),
                    request.FileUrl.Trim(),
                    StringComparison.OrdinalIgnoreCase)))
            {
                artifactRequests.Insert(0, new DeliverableArtifactRequest
                {
                    ArtifactType = "FILE",
                    Label = "Primary deliverable",
                    Url = request.FileUrl.Trim(),
                    AccessLevel = ArtifactAccessPublic
                });
            }

            if (artifactRequests.Count == 0)
            {
                throw new InvalidOperationException("At least one product artifact is required.");
            }

            if (artifactRequests.Count > artifactLimit)
            {
                throw new InvalidOperationException(
                    $"A deliverable can contain at most {artifactLimit} artifacts.");
            }

            var normalizedArtifacts = new List<ValidatedArtifactData>();
            var normalizedUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            for (var index = 0; index < artifactRequests.Count; index++)
            {
                var artifact = artifactRequests[index];
                var fieldPrefix = $"Artifacts[{index}]";
                var artifactType = NormalizeRequiredCode(
                    artifact.ArtifactType,
                    $"{fieldPrefix}.ArtifactType");

                if (!AllowedArtifactTypes.Contains(artifactType))
                {
                    throw new InvalidOperationException(
                        $"{fieldPrefix}.ArtifactType must be one of: {string.Join(", ", AllowedArtifactTypes.OrderBy(x => x))}.");
                }

                var label = NormalizeRequiredText(artifact.Label, $"{fieldPrefix}.Label", 200);
                var accessLevel = string.IsNullOrWhiteSpace(artifact.AccessLevel)
                    ? ArtifactAccessPublic
                    : artifact.AccessLevel.Trim().ToUpperInvariant();

                if (accessLevel != ArtifactAccessPublic && accessLevel != ArtifactAccessRestricted)
                {
                    throw new InvalidOperationException(
                        $"{fieldPrefix}.AccessLevel must be PUBLIC or RESTRICTED.");
                }

                var url = await _externalUrlValidator.ValidateOptionalUrlAsync(
                    artifact.Url,
                    $"{fieldPrefix}.Url",
                    maxLength: 500,
                    requireReachable: accessLevel == ArtifactAccessPublic);

                if (string.IsNullOrWhiteSpace(url))
                {
                    throw new InvalidOperationException($"{fieldPrefix}.Url is required.");
                }

                if (!normalizedUrls.Add(url))
                {
                    throw new InvalidOperationException("Deliverable artifact URLs must be unique.");
                }

                var version = NormalizeOptionalText(artifact.Version, 100, $"{fieldPrefix}.Version");
                var commitHash = NormalizeOptionalText(artifact.CommitHash, 100, $"{fieldPrefix}.CommitHash");

                if (artifactType == "SOURCE_REPOSITORY" && string.IsNullOrWhiteSpace(commitHash))
                {
                    throw new InvalidOperationException(
                        $"{fieldPrefix}.CommitHash is required for SOURCE_REPOSITORY artifacts so the submitted version cannot change after review.");
                }

                normalizedArtifacts.Add(new ValidatedArtifactData(
                    artifactType,
                    label,
                    url,
                    NormalizeOptionalText(artifact.Provider, 100, $"{fieldPrefix}.Provider"),
                    accessLevel,
                    version,
                    commitHash,
                    NormalizeOptionalText(artifact.Checksum, 200, $"{fieldPrefix}.Checksum"),
                    accessLevel == ArtifactAccessPublic
                        ? ArtifactValidationValid
                        : ArtifactValidationAuthRequired,
                    DateTime.UtcNow));
            }

            var demoUrl = await _externalUrlValidator.ValidateOptionalUrlAsync(
                request.DemoUrl,
                nameof(request.DemoUrl),
                maxLength: 500);

            var testResultUrl = await _externalUrlValidator.ValidateOptionalUrlAsync(
                request.TestResultUrl,
                nameof(request.TestResultUrl),
                maxLength: 500);

            return new ValidatedDeliveryData(
                normalizedArtifacts,
                demoUrl,
                testResultUrl);
        }

        private static string NormalizeRequiredCode(string? value, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new InvalidOperationException($"{fieldName} is required.");
            }

            return value.Trim().ToUpperInvariant();
        }

        private static string NormalizeRequiredText(
            string? value,
            string fieldName,
            int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new InvalidOperationException($"{fieldName} is required.");
            }

            var normalized = value.Trim();
            if (normalized.Length > maxLength)
            {
                throw new InvalidOperationException(
                    $"{fieldName} must not exceed {maxLength} characters.");
            }

            return normalized;
        }

        private static string? NormalizeOptionalText(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static string? NormalizeOptionalText(
            string? value,
            int maxLength,
            string fieldName)
        {
            var normalized = NormalizeOptionalText(value);

            if (normalized != null && normalized.Length > maxLength)
            {
                throw new InvalidOperationException(
                    $"{fieldName} must not exceed {maxLength} characters.");
            }

            return normalized;
        }

        private static void ValidateRevisionRequest(RevisionRequest request)
        {
            if (request == null)
            {
                throw new InvalidOperationException("Revision request is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Feedback))
            {
                throw new InvalidOperationException("Revision feedback is required.");
            }
        }

        private static void EnsureProjectEscrowLockedForDeliverableAction(
            Project project,
            Milestone milestone)
        {
            if (!string.Equals(project.Status, ProjectStatusActive, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Project is not active. Deliverable actions are only allowed after escrow is locked.");
            }

            if (project.EscrowLockedAt == null)
            {
                throw new InvalidOperationException(
                    "Project escrow is not locked yet.");
            }

            if (!string.Equals(milestone.PaymentStatus, PaymentStatusLocked, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Milestone escrow is not locked yet.");
            }
        }

        private static bool CanSubmitForMilestone(Milestone milestone)
        {
            return string.Equals(milestone.Status, MilestoneStatusFunded, StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(milestone.Status, MilestoneStatusInProgress, StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(milestone.Status, MilestoneStatusOverdue, StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(milestone.Status, MilestoneStatusRevisionRequested, StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsFinishedMilestone(Milestone milestone)
        {
            var status = milestone.Status?.Trim().ToUpperInvariant();

            return status == MilestoneStatusApproved ||
                   status == MilestoneStatusResolved ||
                   status == MilestoneStatusDisputeResolved ||
                   status == MilestoneStatusReleased ||
                   status == MilestoneStatusRefunded;
        }

        private async Task TryCompleteProjectAfterApprovalAsync(int projectId)
        {
            await _projectCompletionService.TryCompleteProjectAsync(projectId);
        }

        private async Task EnsureUserCanAccessDeliverableContextAsync(
            int currentUserId,
            ClientProfile clientProfile,
            ExpertProfile expertProfile)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == currentUserId);

            if (user == null)
            {
                throw new InvalidOperationException("User not found.");
            }

            if (string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            if (clientProfile.UserId == currentUserId ||
                expertProfile.UserId == currentUserId)
            {
                return;
            }

            throw new UnauthorizedAccessException("You do not have permission to access this deliverable.");
        }

        private async Task<Deliverable> GetDeliverableAsync(int deliverableId)
        {
            var deliverable = await _context.Deliverables
                .FirstOrDefaultAsync(d => d.DeliverableId == deliverableId);

            if (deliverable == null)
            {
                throw new InvalidOperationException("Deliverable not found.");
            }

            return deliverable;
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
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
            {
                throw new InvalidOperationException("User not found.");
            }

            return user;
        }

        private async Task<DeliverableResponse> MapToDeliverableResponseAsync(Deliverable deliverable)
        {
            var milestone = await GetMilestoneAsync(deliverable.MilestoneId);
            var project = await GetProjectAsync(milestone.ProjectId);
            var contract = await GetContractAsync(project.ContractId);
            var clientProfile = await GetClientProfileAsync(contract.ClientId);
            var expertProfile = await GetExpertProfileAsync(deliverable.ExpertId);

            var clientUser = await GetUserAsync(clientProfile.UserId);
            var expertUser = await GetUserAsync(expertProfile.UserId);

            return new DeliverableResponse
            {
                DeliverableId = deliverable.DeliverableId,
                MilestoneId = milestone.MilestoneId,
                MilestoneTitle = milestone.Title,
                ProjectId = project.ProjectId,
                ProjectTitle = project.Title,

                ExpertProfileId = expertProfile.ExpertProfileId,
                ExpertUserId = expertProfile.UserId,
                ExpertName = expertUser.FullName,

                ClientProfileId = clientProfile.ClientProfileId,
                ClientUserId = clientProfile.UserId,
                ClientName = clientUser.FullName,

                FileUrl = deliverable.FileUrl,
                Artifacts = await _context.DeliverableArtifacts
                    .AsNoTracking()
                    .Where(x => x.DeliverableId == deliverable.DeliverableId)
                    .OrderBy(x => x.DeliverableArtifactId)
                    .Select(x => new DeliverableArtifactResponse
                    {
                        DeliverableArtifactId = x.DeliverableArtifactId,
                        DeliverableId = x.DeliverableId,
                        ArtifactType = x.ArtifactType,
                        Label = x.Label,
                        Url = x.Url,
                        Provider = x.Provider,
                        AccessLevel = x.AccessLevel,
                        Version = x.Version,
                        CommitHash = x.CommitHash,
                        Checksum = x.Checksum,
                        ValidationStatus = x.ValidationStatus,
                        ValidatedAt = x.ValidatedAt,
                        CreatedAt = x.CreatedAt
                    })
                    .ToListAsync(),
                DemoUrl = deliverable.DemoUrl,
                DemoInstructions = deliverable.DemoInstructions,
                DemoValidationStatus = deliverable.DemoValidationStatus,
                Description = deliverable.Description,
                HandoverNotes = deliverable.HandoverNotes,
                TestResultUrl = deliverable.TestResultUrl,
                TestSummary = deliverable.TestSummary,
                TestValidationStatus = deliverable.TestValidationStatus,
                ClientFeedback = deliverable.ClientFeedback,
                VersionNumber = deliverable.VersionNumber,
                Status = deliverable.Status,

                MilestoneStatus = milestone.Status,
                MilestonePaymentStatus = milestone.PaymentStatus,
                RevisionUsed = milestone.RevisionUsed,

                SubmittedAt = deliverable.SubmittedAt,
                ReviewDeadlineAt = deliverable.ReviewDeadlineAt,
                ReviewedAt = deliverable.ReviewedAt
            };
        }

        private sealed record ValidatedDeliveryData(
            IReadOnlyList<ValidatedArtifactData> Artifacts,
            string? DemoUrl,
            string? TestResultUrl);

        private sealed record ValidatedArtifactData(
            string ArtifactType,
            string Label,
            string Url,
            string? Provider,
            string AccessLevel,
            string? Version,
            string? CommitHash,
            string? Checksum,
            string ValidationStatus,
            DateTime ValidatedAt);

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
    }
}