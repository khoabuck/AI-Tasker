namespace AITasker.Application.DTOs.Responses
{
    public class DisputeResponse
    {
        public int DisputeId { get; set; }

        public int ProjectId { get; set; }

        public string ProjectTitle { get; set; } = string.Empty;

        public int? MilestoneId { get; set; }

        public string? MilestoneTitle { get; set; }

        public int? DeliverableId { get; set; }

        public int? DeliverableVersionNumber { get; set; }

        public string? DeliverableStatus { get; set; }

        public int ClientProfileId { get; set; }

        public int ClientUserId { get; set; }

        public string ClientName { get; set; } = string.Empty;

        public int ExpertProfileId { get; set; }

        public int ExpertUserId { get; set; }

        public string ExpertName { get; set; } = string.Empty;

        public int OpenedByUserId { get; set; }

        public string OpenedByName { get; set; } = string.Empty;

        public int RespondentUserId { get; set; }

        public string RespondentName { get; set; } = string.Empty;

        public string Reason { get; set; } = string.Empty;

        public decimal DisputedAmount { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? ResolutionType { get; set; }

        public string? AdminDecision { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ResolvedAt { get; set; }

        public List<DisputeEvidenceResponse> Evidences { get; set; } = new();
    }
}