namespace AITasker.Application.DTOs.Responses
{
    public class ExpertPublicReviewResponse
    {
        public int ReviewId { get; set; }

        public int Rating { get; set; }

        public string? Comment { get; set; }

        public bool IsVerifiedProjectReview { get; set; } = true;

        public DateTime CreatedAt { get; set; }
    }
}
