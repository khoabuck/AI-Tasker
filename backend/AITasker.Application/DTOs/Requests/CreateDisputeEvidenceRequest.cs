namespace AITasker.Application.DTOs.Requests
{
    public class CreateDisputeEvidenceRequest
    {
        public string EvidenceText { get; set; } = string.Empty;

        public string? FileUrl { get; set; }

        public string? ImageUrl { get; set; }
    }
}