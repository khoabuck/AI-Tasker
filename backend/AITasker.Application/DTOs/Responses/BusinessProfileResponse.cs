namespace AITasker.Application.DTOs.Responses;

public class BusinessProfileResponse
{
    public int BusinessProfileId { get; set; }

    public int ClientProfileId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string TaxCode { get; set; } = string.Empty;

    public string Industry { get; set; } = string.Empty;

    public string CompanyAddress { get; set; } = string.Empty;

    public string? BusinessEmail { get; set; }

    public string? BusinessPhone { get; set; }

    public string VerificationStatus { get; set; } = string.Empty;

    public string? VerificationNote { get; set; }

    public int VerificationSubmissionCount { get; set; }

    public DateTime? VerificationLockedUntil { get; set; }

    public DateTime? VerifiedAt { get; set; }
}