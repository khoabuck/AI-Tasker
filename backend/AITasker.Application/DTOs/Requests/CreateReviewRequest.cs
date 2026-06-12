namespace AITasker.Application.DTOs.Requests
{
    public class CreateReviewRequest
    {
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}