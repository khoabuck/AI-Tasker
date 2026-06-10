namespace AITasker.Application.DTOs.Requests;

public class BusinessVerificationProviderRequest
{
    public string CompanyName { get; set; } = string.Empty;

    public string TaxCode { get; set; } = string.Empty;

    public string Industry { get; set; } = string.Empty;

    public string CompanyAddress { get; set; } = string.Empty;

    public string? BusinessEmail { get; set; }

    public string? BusinessPhone { get; set; }
}