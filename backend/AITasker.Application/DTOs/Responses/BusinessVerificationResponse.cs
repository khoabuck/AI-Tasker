namespace AITasker.Application.DTOs.Responses;

public class BusinessVerificationResponse
{
    public int BusinessProfileId { get; set; }

    public int ClientProfileId { get; set; }

    public int UserId { get; set; }

    public string UserEmail { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string UserStatus { get; set; } = string.Empty;

    public string CompanyName { get; set; } = string.Empty;

    public string TaxCode { get; set; } = string.Empty;

    public string Industry { get; set; } = string.Empty;

    public string CompanyAddress { get; set; } = string.Empty;

    public string? BusinessEmail { get; set; }

    public string? BusinessPhone { get; set; }

    public string VerificationStatus { get; set; } = string.Empty;

    public string? VerificationNote { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}