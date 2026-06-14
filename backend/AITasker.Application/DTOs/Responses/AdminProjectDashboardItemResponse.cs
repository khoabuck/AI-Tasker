namespace AITasker.Application.DTOs.Responses
{
    public class AdminProjectDashboardItemResponse
    {
        public int ProjectId { get; set; }

        public int ContractId { get; set; }

        public int ProposalId { get; set; }

        public int JobId { get; set; }

        public string ProjectTitle { get; set; } = string.Empty;

        public string JobTitle { get; set; } = string.Empty;

        public string ProjectStatus { get; set; } = string.Empty;

        public string ContractStatus { get; set; } = string.Empty;

        public int ClientProfileId { get; set; }

        public int ClientUserId { get; set; }

        public string ClientName { get; set; } = string.Empty;

        public int ExpertProfileId { get; set; }

        public int ExpertUserId { get; set; }

        public string ExpertName { get; set; } = string.Empty;

        public decimal ProjectTotalBudget { get; set; }

        public decimal ContractFinalPrice { get; set; }

        public decimal PlatformFeeAmount { get; set; }

        public decimal TotalClientPayment { get; set; }

        public int MilestoneCount { get; set; }

        public int PendingMilestoneCount { get; set; }

        public int FundedMilestoneCount { get; set; }

        public int SubmittedMilestoneCount { get; set; }

        public int ApprovedMilestoneCount { get; set; }

        public int DisputedMilestoneCount { get; set; }

        public decimal EscrowLockedAmount { get; set; }

        public decimal EscrowFrozenAmount { get; set; }

        public decimal EscrowReleasedAmount { get; set; }

        public decimal EscrowRefundedAmount { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }
    }
}