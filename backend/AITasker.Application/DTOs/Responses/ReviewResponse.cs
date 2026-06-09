namespace AITasker.Application.DTOs.Responses;

public class ReviewResponse
{
    public int ReviewId { get; set; }
    public int ProjectId { get; set; }
    public int ReviewerId { get; set; }
    public int RevieweeId { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
