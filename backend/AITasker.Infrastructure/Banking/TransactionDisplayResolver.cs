using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Banking
{
    internal sealed record TransactionDisplayContext(
        string? ProjectTitle,
        string? MilestoneTitle,
        int? ContractId,
        string? ContractTitle,
        int? ProposalId,
        string? ProposalTitle,
        int? JobId,
        string? JobTitle);

    internal sealed record TransactionDisplayData(
        string Category,
        string StatusGroup,
        string DisplayTitle,
        string DisplaySubtitle,
        string DisplayDescription,
        string ReferenceType,
        string ReferenceDisplayName);

    internal static class TransactionDisplayResolver
    {
        /// <summary>
        /// Loads the complete Proposal → Contract → Project → Milestone context for wallet transactions.
        /// </summary>
        public static async Task<IReadOnlyDictionary<int, TransactionDisplayContext>>
            LoadTransactionContextsAsync(
                AITaskerDbContext context,
                IReadOnlyCollection<Transaction> transactions)
        {
            var milestoneIds = transactions
                .Where(x => x.MilestoneId.HasValue)
                .Select(x => x.MilestoneId!.Value)
                .Distinct()
                .ToList();

            var milestones = milestoneIds.Count == 0
                ? new Dictionary<int, Milestone>()
                : await context.Milestones
                    .AsNoTracking()
                    .Where(x => milestoneIds.Contains(x.MilestoneId))
                    .ToDictionaryAsync(x => x.MilestoneId);

            var projectIds = transactions
                .Where(x => x.ProjectId.HasValue)
                .Select(x => x.ProjectId!.Value)
                .Concat(milestones.Values.Select(x => x.ProjectId))
                .Distinct()
                .ToList();

            var projects = projectIds.Count == 0
                ? new Dictionary<int, Project>()
                : await context.Projects
                    .AsNoTracking()
                    .Where(x => projectIds.Contains(x.ProjectId))
                    .ToDictionaryAsync(x => x.ProjectId);

            var contractIds = projects.Values
                .Select(x => x.ContractId)
                .Distinct()
                .ToList();

            var contracts = contractIds.Count == 0
                ? new Dictionary<int, ProjectContract>()
                : await context.ProjectContracts
                    .AsNoTracking()
                    .Where(x => contractIds.Contains(x.ContractId))
                    .ToDictionaryAsync(x => x.ContractId);

            var proposalIds = contracts.Values
                .Select(x => x.ProposalId)
                .Distinct()
                .ToList();

            var proposals = proposalIds.Count == 0
                ? new Dictionary<int, Proposal>()
                : await context.Proposals
                    .AsNoTracking()
                    .Where(x => proposalIds.Contains(x.ProposalId))
                    .ToDictionaryAsync(x => x.ProposalId);

            var jobIds = proposals.Values
                .Select(x => x.JobId)
                .Distinct()
                .ToList();

            var jobs = jobIds.Count == 0
                ? new Dictionary<int, JobPosting>()
                : await context.JobPostings
                    .AsNoTracking()
                    .Where(x => jobIds.Contains(x.JobPostingId))
                    .ToDictionaryAsync(x => x.JobPostingId);

            return transactions.ToDictionary(
                transaction => transaction.TransactionId,
                transaction => BuildContext(
                    transaction.ProjectId,
                    transaction.MilestoneId,
                    projects,
                    milestones,
                    contracts,
                    proposals,
                    jobs));
        }

        /// <summary>
        /// Loads display context for platform revenue transactions without exposing raw numeric IDs as labels.
        /// </summary>
        public static async Task<IReadOnlyDictionary<int, TransactionDisplayContext>>
            LoadPlatformTransactionContextsAsync(
                AITaskerDbContext context,
                IReadOnlyCollection<PlatformTransaction> transactions)
        {
            var projectIds = transactions
                .Where(x => x.ProjectId.HasValue)
                .Select(x => x.ProjectId!.Value)
                .Distinct()
                .ToList();

            var projects = projectIds.Count == 0
                ? new Dictionary<int, Project>()
                : await context.Projects
                    .AsNoTracking()
                    .Where(x => projectIds.Contains(x.ProjectId))
                    .ToDictionaryAsync(x => x.ProjectId);

            var contractIds = transactions
                .Where(x => x.ContractId.HasValue)
                .Select(x => x.ContractId!.Value)
                .Concat(projects.Values.Select(x => x.ContractId))
                .Distinct()
                .ToList();

            var contracts = contractIds.Count == 0
                ? new Dictionary<int, ProjectContract>()
                : await context.ProjectContracts
                    .AsNoTracking()
                    .Where(x => contractIds.Contains(x.ContractId))
                    .ToDictionaryAsync(x => x.ContractId);

            var proposalIds = contracts.Values
                .Select(x => x.ProposalId)
                .Distinct()
                .ToList();

            var proposals = proposalIds.Count == 0
                ? new Dictionary<int, Proposal>()
                : await context.Proposals
                    .AsNoTracking()
                    .Where(x => proposalIds.Contains(x.ProposalId))
                    .ToDictionaryAsync(x => x.ProposalId);

            var jobIds = proposals.Values
                .Select(x => x.JobId)
                .Distinct()
                .ToList();

            var jobs = jobIds.Count == 0
                ? new Dictionary<int, JobPosting>()
                : await context.JobPostings
                    .AsNoTracking()
                    .Where(x => jobIds.Contains(x.JobPostingId))
                    .ToDictionaryAsync(x => x.JobPostingId);

            return transactions.ToDictionary(
                transaction => transaction.PlatformTransactionId,
                transaction => BuildContext(
                    transaction.ProjectId,
                    milestoneId: null,
                    projects,
                    new Dictionary<int, Milestone>(),
                    contracts,
                    proposals,
                    jobs,
                    transaction.ContractId));
        }

        /// <summary>
        /// Creates stable user-facing labels while preserving Description and ReferenceId as technical audit data.
        /// </summary>
        public static TransactionDisplayData Resolve(
            string type,
            string status,
            string description,
            string? referenceId,
            TransactionDisplayContext? context)
        {
            context ??= EmptyContext;

            var normalizedType = Normalize(type);
            var category = ResolveCategory(normalizedType);
            var statusGroup = ResolveStatusGroup(status, normalizedType);
            var referenceType = ResolveReferenceType(
                referenceId,
                context.MilestoneTitle,
                context.ProjectTitle,
                context.ContractId,
                context.ProposalId,
                context.JobId);
            var referenceDisplayName = ResolveReferenceDisplayName(referenceType, context);
            var displayTitle = ResolveTitle(normalizedType);
            var displaySubtitle = BuildSubtitle(referenceDisplayName, context.ProjectTitle, context.JobTitle);
            var displayDescription = ResolveDescription(
                normalizedType,
                displayTitle,
                referenceDisplayName,
                description);

            return new TransactionDisplayData(
                category,
                statusGroup,
                displayTitle,
                displaySubtitle,
                displayDescription,
                referenceType,
                referenceDisplayName);
        }

        private static readonly TransactionDisplayContext EmptyContext = new(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null);

        private static TransactionDisplayContext BuildContext(
            int? projectId,
            int? milestoneId,
            IReadOnlyDictionary<int, Project> projects,
            IReadOnlyDictionary<int, Milestone> milestones,
            IReadOnlyDictionary<int, ProjectContract> contracts,
            IReadOnlyDictionary<int, Proposal> proposals,
            IReadOnlyDictionary<int, JobPosting> jobs,
            int? explicitContractId = null)
        {
            Milestone? milestone = null;
            if (milestoneId.HasValue)
            {
                milestones.TryGetValue(milestoneId.Value, out milestone);
            }

            Project? project = null;
            var resolvedProjectId = projectId ?? milestone?.ProjectId;
            if (resolvedProjectId.HasValue)
            {
                projects.TryGetValue(resolvedProjectId.Value, out project);
            }

            ProjectContract? contract = null;
            var resolvedContractId = explicitContractId ?? project?.ContractId;
            if (resolvedContractId.HasValue)
            {
                contracts.TryGetValue(resolvedContractId.Value, out contract);
            }

            Proposal? proposal = null;
            if (contract != null)
            {
                proposals.TryGetValue(contract.ProposalId, out proposal);
            }

            JobPosting? job = null;
            if (proposal != null)
            {
                jobs.TryGetValue(proposal.JobId, out job);
            }

            var jobTitle = job?.Title;

            return new TransactionDisplayContext(
                project?.Title,
                milestone?.Title,
                contract?.ContractId,
                jobTitle == null ? null : $"Contract for {jobTitle}",
                proposal?.ProposalId,
                jobTitle == null ? null : $"Proposal for {jobTitle}",
                job?.JobPostingId,
                jobTitle);
        }

        private static string ResolveCategory(string normalizedType)
        {
            if (normalizedType.Contains("WITHDRAWAL")) return "WITHDRAWAL";
            if (normalizedType.Contains("DEPOSIT")) return "DEPOSIT";
            if (normalizedType.Contains("ESCROW")) return "ESCROW";
            if (normalizedType.Contains("PLATFORM_FEE")) return "PLATFORM_FEE";
            if (normalizedType.Contains("SERVICE_FEE")) return "SERVICE_FEE";
            if (normalizedType.Contains("REFUND")) return "REFUND";
            if (normalizedType.Contains("PENDING_EARNING")) return "PENDING_EARNING";
            if (normalizedType.Contains("PROPOSAL_CREDIT")) return "PROPOSAL_CREDIT";

            return "WALLET";
        }

        private static string ResolveStatusGroup(string status, string normalizedType)
        {
            var normalizedStatus = Normalize(status);

            if (normalizedType.Contains("EXPIRED")) return "EXPIRED";
            if (normalizedType.Contains("PROCESSING")) return "PROCESSING";
            if (normalizedType.Contains("REJECTED") ||
                normalizedType.Contains("CANCELLED") ||
                normalizedType.Contains("CANCELED")) return "CANCELLED";
            if (normalizedType.Contains("REFUND")) return "REFUNDED";
            if (normalizedStatus is "SUCCESS" or "PAID") return "COMPLETED";
            if (normalizedStatus == "FAILED") return "FAILED";
            if (normalizedStatus == "PENDING") return "PENDING";

            return normalizedStatus;
        }

        private static string ResolveTitle(string normalizedType)
        {
            if (normalizedType.Contains("ESCROW_LOCK")) return "Escrow locked";
            if (normalizedType.Contains("ESCROW_RELEASE")) return "Escrow released";
            if (normalizedType.Contains("ESCROW_FREEZE")) return "Escrow frozen";
            if (normalizedType.Contains("PENDING_EARNING_RELEASE")) return "Earnings released";
            if (normalizedType.Contains("PENDING_EARNING")) return "Earnings held";
            if (normalizedType.Contains("EXPERT_SERVICE_FEE")) return "Expert service fee";
            if (normalizedType.Contains("PLATFORM_FEE")) return "Platform fee";
            if (normalizedType.Contains("REFUND")) return "Refund processed";
            if (normalizedType.Contains("WITHDRAWAL")) return "Withdrawal transaction";
            if (normalizedType.Contains("DEPOSIT")) return "Wallet deposit";
            if (normalizedType.Contains("PROPOSAL_CREDIT")) return "Proposal credit transaction";

            return Humanize(normalizedType);
        }

        private static string ResolveReferenceType(
            string? referenceId,
            string? milestoneTitle,
            string? projectTitle,
            int? contractId,
            int? proposalId,
            int? jobId)
        {
            if (!string.IsNullOrWhiteSpace(referenceId))
            {
                var separatorIndex = referenceId.IndexOf('_');
                var prefix = separatorIndex > 0
                    ? referenceId[..separatorIndex]
                    : referenceId;

                var normalizedPrefix = Normalize(prefix);
                if (normalizedPrefix is "MILESTONE" or "PROJECT" or "CONTRACT" or
                    "PROPOSAL" or "JOB" or "DISPUTE" or "WITHDRAWAL" or
                    "DEPOSIT" or "PAYOS")
                {
                    return normalizedPrefix;
                }
            }

            if (!string.IsNullOrWhiteSpace(milestoneTitle)) return "MILESTONE";
            if (!string.IsNullOrWhiteSpace(projectTitle)) return "PROJECT";
            if (contractId.HasValue) return "CONTRACT";
            if (proposalId.HasValue) return "PROPOSAL";
            if (jobId.HasValue) return "JOB";

            return "TRANSACTION";
        }

        private static string ResolveReferenceDisplayName(
            string referenceType,
            TransactionDisplayContext context)
        {
            return referenceType switch
            {
                "MILESTONE" => context.MilestoneTitle ?? context.ProjectTitle ?? "Milestone transaction",
                "PROJECT" => context.ProjectTitle ?? context.JobTitle ?? "Project transaction",
                "CONTRACT" => context.ContractTitle ?? context.ProjectTitle ?? context.JobTitle ?? "Contract transaction",
                "PROPOSAL" => context.ProposalTitle ?? context.JobTitle ?? "Proposal transaction",
                "JOB" => context.JobTitle ?? "Job transaction",
                "DISPUTE" => context.MilestoneTitle ?? context.ProjectTitle ?? "Dispute transaction",
                "WITHDRAWAL" => "Withdrawal request",
                "DEPOSIT" or "PAYOS" => "Wallet deposit",
                _ => context.MilestoneTitle ?? context.ProjectTitle ?? context.JobTitle ?? "Wallet transaction"
            };
        }

        private static string BuildSubtitle(
            string referenceDisplayName,
            string? projectTitle,
            string? jobTitle)
        {
            var parts = new List<string>();

            if (!string.IsNullOrWhiteSpace(referenceDisplayName))
            {
                parts.Add(referenceDisplayName);
            }

            if (!string.IsNullOrWhiteSpace(projectTitle) &&
                !parts.Contains(projectTitle, StringComparer.OrdinalIgnoreCase))
            {
                parts.Add(projectTitle);
            }
            else if (!string.IsNullOrWhiteSpace(jobTitle) &&
                !parts.Contains(jobTitle, StringComparer.OrdinalIgnoreCase))
            {
                parts.Add(jobTitle);
            }

            return string.Join(" • ", parts);
        }

        private static string ResolveDescription(
            string normalizedType,
            string displayTitle,
            string referenceDisplayName,
            string technicalDescription)
        {
            var quotedReference = string.IsNullOrWhiteSpace(referenceDisplayName)
                ? string.Empty
                : $" for ‘{referenceDisplayName}’";

            if (normalizedType.Contains("ESCROW_LOCK"))
                return $"Project funds were locked in escrow{quotedReference}.";
            if (normalizedType.Contains("ESCROW_RELEASE"))
                return $"Escrow funds were released{quotedReference}.";
            if (normalizedType.Contains("ESCROW_FREEZE"))
                return $"Escrow funds were frozen because of a dispute{quotedReference}.";
            if (normalizedType.Contains("PENDING_EARNING_RELEASE"))
                return $"Held expert earnings became available{quotedReference}.";
            if (normalizedType.Contains("PENDING_EARNING"))
                return $"Expert earnings are held until the project is completed{quotedReference}.";
            if (normalizedType.Contains("EXPERT_SERVICE_FEE"))
                return $"The expert service fee was recorded{quotedReference}.";
            if (normalizedType.Contains("PLATFORM_FEE"))
                return $"The platform fee was recorded{quotedReference}.";
            if (normalizedType.Contains("REFUND"))
                return $"Funds were refunded{quotedReference}.";
            if (normalizedType.Contains("WITHDRAWAL"))
                return "A wallet withdrawal transaction was recorded.";
            if (normalizedType.Contains("DEPOSIT"))
                return "A wallet deposit was recorded.";
            if (normalizedType.Contains("PROPOSAL_CREDIT"))
                return "A proposal credit purchase transaction was recorded.";

            return string.IsNullOrWhiteSpace(technicalDescription)
                ? displayTitle
                : technicalDescription;
        }

        private static string Humanize(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return "Wallet transaction";
            }

            var words = value
                .Split('_', StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.ToLowerInvariant())
                .ToArray();

            if (words.Length == 0)
            {
                return "Wallet transaction";
            }

            var text = string.Join(' ', words);
            return char.ToUpperInvariant(text[0]) + text[1..];
        }

        private static string Normalize(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : value.Trim().ToUpperInvariant();
        }
    }
}
