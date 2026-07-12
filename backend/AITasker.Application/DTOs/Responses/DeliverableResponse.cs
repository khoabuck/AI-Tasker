namespace AITasker.Application.DTOs.Responses
{
    public class DeliverableResponse
    {
        public int DeliverableId { get; set; }

        public int MilestoneId { get; set; }

        public string MilestoneTitle { get; set; } = string.Empty;

        public int ProjectId { get; set; }

        public string ProjectTitle { get; set; } = string.Empty;

        public int ExpertProfileId { get; set; }

        public int ExpertUserId { get; set; }

        public string ExpertName { get; set; } = string.Empty;

        public int ClientProfileId { get; set; }

        public int ClientUserId { get; set; }

        public string ClientName { get; set; } = string.Empty;

        public string? FileUrl { get; set; }

        public List<DeliverableArtifactResponse> Artifacts { get; set; } = new();

        public string? DemoUrl { get; set; }

        public string? DemoInstructions { get; set; }

        public string? DemoValidationStatus { get; set; }

        public string Description { get; set; } = string.Empty;

        public string? HandoverNotes { get; set; }

        public string? TestResultUrl { get; set; }

        public string? TestSummary { get; set; }

        public string? TestValidationStatus { get; set; }

        public string? ClientFeedback { get; set; }

        public int VersionNumber { get; set; }

        public string Status { get; set; } = string.Empty;

        public string MilestoneStatus { get; set; } = string.Empty;

        public string MilestonePaymentStatus { get; set; } = string.Empty;

        public int RevisionUsed { get; set; }

        public DateTime SubmittedAt { get; set; }

        public DateTime? ReviewDeadlineAt { get; set; }

        public DateTime? ReviewedAt { get; set; }
    }
}
