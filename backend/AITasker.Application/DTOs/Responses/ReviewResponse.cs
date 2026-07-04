namespace AITasker.Application.DTOs.Responses
{
    public class ReviewResponse
    {
        public int ReviewId { get; set; }

        public int ProjectId { get; set; }

        public string ProjectTitle { get; set; } = string.Empty;

        public int ClientId { get; set; }

        public int ClientUserId { get; set; }

        public int ClientProfileId { get; set; }

        public string ClientName { get; set; } = string.Empty;

        public string? ClientAvatarUrl { get; set; }

        public int ExpertId { get; set; }

        public int ExpertUserId { get; set; }

        public int ExpertProfileId { get; set; }

        public string ExpertName { get; set; } = string.Empty;

        public string? ExpertAvatarUrl { get; set; }

        public int Rating { get; set; }

        public string? Comment { get; set; }

        public string Status { get; set; } = "VISIBLE";

        public string? HiddenReason { get; set; }

        public DateTime? HiddenAt { get; set; }

        public int? HiddenByAdminId { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
