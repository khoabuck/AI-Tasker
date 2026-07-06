namespace AITasker.Application.DTOs.Responses
{
    public class DisputeEvidenceResponse
    {
        public int EvidenceId { get; set; }

        public int DisputeId { get; set; }

        public int UploadedByUserId { get; set; }

        public string UploadedByName { get; set; } = string.Empty;

        public string EvidenceText { get; set; } = string.Empty;

        public string? FileUrl { get; set; }

        // URL used by FE/Admin to preview and view uploaded image evidence.
        public string? ImageUrl { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
