namespace AITasker.Application.DTOs.Requests
{
    public class CreateDisputeEvidenceRequest
    {
        public string EvidenceText { get; set; } = string.Empty;

        // External file URL, for example Google Drive, PDF, ZIP, demo URL.
        public string? FileUrl { get; set; }

        // External direct image URL or uploaded image URL.
        public string? ImageUrl { get; set; }

        // Used by multipart image upload endpoint after backend uploads many images.
        public List<string> ImageUrls { get; set; } = new();
    }
}
