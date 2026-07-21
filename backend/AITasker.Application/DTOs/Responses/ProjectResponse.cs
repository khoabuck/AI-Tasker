namespace AITasker.Application.DTOs.Responses
{
    public class ProjectResponse
    {
        public int ProjectId { get; set; }

        public int ContractId { get; set; }

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

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public decimal TotalBudget { get; set; }

        public decimal MilestoneTotalAmount { get; set; }

        public decimal RemainingMilestoneAmount { get; set; }

        public string Status { get; set; } = string.Empty;

        public string ContractStatus { get; set; } = string.Empty;

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public DateTime? EscrowLockedAt { get; set; }

        public bool RequiresPostDisputeDecision { get; set; }

        public int? LatestResolvedDisputeId { get; set; }

        public DateTime CreatedAt { get; set; }

        public List<MilestoneResponse> Milestones { get; set; } = new();
    }
}