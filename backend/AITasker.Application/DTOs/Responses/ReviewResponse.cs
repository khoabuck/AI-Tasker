namespace AITasker.Application.DTOs.Responses
{
    public class ReviewResponse
    {
        public int ReviewId { get; set; }
        public int ProjectId { get; set; }
        public int ClientId { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string? ClientAvatarUrl { get; set; }
        public int ExpertId { get; set; }
        public string ExpertName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}