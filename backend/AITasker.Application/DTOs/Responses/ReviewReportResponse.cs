namespace AITasker.Application.DTOs.Responses
{
    public class ReviewReportResponse
    {
        public int ReviewReportId { get; set; }

        public int ReviewId { get; set; }

        public int ProjectId { get; set; }

        public string ProjectTitle { get; set; } = string.Empty;

        public int ExpertUserId { get; set; }

        public string ExpertName { get; set; } = string.Empty;

        public int ClientUserId { get; set; }

        public string ClientName { get; set; } = string.Empty;

        public int Rating { get; set; }

        public string? ReviewComment { get; set; }

        public string ReviewStatus { get; set; } = string.Empty;

        public string Reason { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public string? AdminDecision { get; set; }

        public int? ResolvedByAdminId { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ResolvedAt { get; set; }
    }

    public class ReviewReportDetailResponse : ReviewReportResponse
    {
        public decimal ContractFinalPrice { get; set; }

        public decimal ExpertReceivableAmount { get; set; }

        public string ProjectStatus { get; set; } = string.Empty;

        public DateTime? ProjectStartDate { get; set; }

        public DateTime? ProjectEndDate { get; set; }

        public IReadOnlyList<ReviewReportMilestoneSummaryResponse> Milestones { get; set; } =
            Array.Empty<ReviewReportMilestoneSummaryResponse>();

        public IReadOnlyList<ReviewReportDisputeSummaryResponse> Disputes { get; set; } =
            Array.Empty<ReviewReportDisputeSummaryResponse>();
    }

    public class ReviewReportMilestoneSummaryResponse
    {
        public int MilestoneId { get; set; }

        public string Title { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int OrderIndex { get; set; }

        public string Status { get; set; } = string.Empty;

        public string PaymentStatus { get; set; } = string.Empty;

        public DateTime Deadline { get; set; }

        public int DeliverableCount { get; set; }

        public int SubmittedDeliverableCount { get; set; }

        public int ApprovedDeliverableCount { get; set; }

        public int RevisionRequestedDeliverableCount { get; set; }

        public IReadOnlyList<ReviewReportDeliverableSummaryResponse> Deliverables { get; set; } =
            Array.Empty<ReviewReportDeliverableSummaryResponse>();
    }

    public class ReviewReportDeliverableSummaryResponse
    {
        public int DeliverableId { get; set; }

        public int VersionNumber { get; set; }

        public string Status { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string? ClientFeedback { get; set; }

        public DateTime SubmittedAt { get; set; }

        public DateTime? ReviewedAt { get; set; }
    }

    public class ReviewReportDisputeSummaryResponse
    {
        public int DisputeId { get; set; }

        public int? MilestoneId { get; set; }

        public string Reason { get; set; } = string.Empty;

        public decimal DisputedAmount { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? ResolutionType { get; set; }

        public string? AdminDecision { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ResolvedAt { get; set; }
    }
}
