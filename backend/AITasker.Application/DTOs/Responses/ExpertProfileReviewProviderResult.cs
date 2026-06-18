namespace AITasker.Application.DTOs.Responses;

public class ExpertProfileReviewProviderResult
{
    // APPROVED / NEEDS_CORRECTION
    public string Status { get; set; } = "NEEDS_CORRECTION";

    public decimal ProfileScore { get; set; }

    public string Level { get; set; } = "FRESHER";

    public string ExpertCategory { get; set; } = "OTHER";

    public string? ReviewNote { get; set; }

    public string? MissingInformation { get; set; }
}