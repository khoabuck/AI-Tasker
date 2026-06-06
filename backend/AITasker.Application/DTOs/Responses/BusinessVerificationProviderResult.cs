namespace AITasker.Application.DTOs.Responses;

public class BusinessVerificationProviderResult
{
    public string Status { get; set; } = "PENDING_REVIEW";

    public decimal ConfidenceScore { get; set; }

    public string Note { get; set; } = string.Empty;
}