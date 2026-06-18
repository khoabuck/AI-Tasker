namespace AITasker.Application.DTOs.Responses;

public class BusinessVerificationProviderResult
{
    public string Status { get; set; } = "NEEDS_CORRECTION";

    public decimal ConfidenceScore { get; set; }

    public string Note { get; set; } = string.Empty;

    // Tax code from VietQR result
    public string? TaxCode { get; set; }

    // Official business name from VietQR
    public string? OfficialCompanyName { get; set; }

    // Official business address from VietQR
    public string? OfficialCompanyAddress { get; set; }

    // Optional extra fields from VietQR
    public string? InternationalName { get; set; }

    public string? ShortName { get; set; }
}