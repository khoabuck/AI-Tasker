namespace AITasker.Application.DTOs.Responses;

public class ExpertProfileReviewProviderResult
{
    // APPROVED / NEEDS_CORRECTION / PENDING_REVIEW
    public string Status { get; set; } = "PENDING_REVIEW";

    public decimal ProfileScore { get; set; } = 0;

    public string Level { get; set; } = "UNKNOWN";

    public string ExpertCategory { get; set; } = "OTHER";

    public string ReviewNote { get; set; } = "AI profile review could not be completed.";

    public string? MissingInformation { get; set; }
}