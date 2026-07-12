namespace AITasker.Application.DTOs.Requests
{
    public class SubmitDeliverableRequest
    {
        public int MilestoneId { get; set; }

        // Legacy single-link field. When Artifacts is empty, backend converts this value
        // into one FILE artifact to keep existing clients compatible.
        public string? FileUrl { get; set; }

        public List<DeliverableArtifactRequest> Artifacts { get; set; } = new();

        public string? DemoUrl { get; set; }

        public string? DemoInstructions { get; set; }

        public string Description { get; set; } = string.Empty;

        public string? HandoverNotes { get; set; }

        public string? TestResultUrl { get; set; }

        public string? TestSummary { get; set; }
    }
}
