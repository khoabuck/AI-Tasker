namespace AITasker.Application.DTOs.Responses
{
    public class ProposalResponse
    {
        public int ProposalId { get; set; }

        public int JobId { get; set; }

        public string JobTitle { get; set; } = string.Empty;

        public int ClientProfileId { get; set; }

        public int ClientUserId { get; set; }

        public string ClientName { get; set; } = string.Empty;

        public string? ClientAvatarUrl { get; set; }

        public int ExpertProfileId { get; set; }

        public int ExpertUserId { get; set; }

        public string ExpertName { get; set; } = string.Empty;

        public string? ExpertAvatarUrl { get; set; }

        public string CoverLetter { get; set; } = string.Empty;

        public decimal ProposedPrice { get; set; }

        public int ProposedTimelineDays { get; set; }

        public string ExpectedOutputs { get; set; } = string.Empty;

        public string WorkingApproach { get; set; } = string.Empty;

        public string? PreliminaryMilestonePlan { get; set; }

        public List<ProposalMilestoneDraftResponse> Milestones { get; set; } = new();

        public string Status { get; set; } = string.Empty;

        public string? StatusReason { get; set; }

        public int? ContractId { get; set; }

        public int ClientMissSignCount { get; set; }

        public int ExpertMissSignCount { get; set; }

        public int LatestVersionNumber { get; set; }

        public int TotalVersions { get; set; }

        public DateTime? LastResubmittedAt { get; set; }

        public int ResubmitLimit { get; set; }

        public int ResubmitWindowHours { get; set; }

        public int? RemainingResubmitsInWindow { get; set; }

        public ProposalVersionResponse? LatestVersion { get; set; }

        public DateTime CreatedAt { get; set; }

    }
}