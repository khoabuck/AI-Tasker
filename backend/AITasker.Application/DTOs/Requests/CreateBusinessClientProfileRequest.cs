namespace AITasker.Application.DTOs.Requests;

public class CreateBusinessClientProfileRequest
{
    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public string? CompanyName { get; set; }

    public string? TaxCode { get; set; }

    public string? Industry { get; set; }

    public string? CompanyAddress { get; set; }

    public string? BusinessEmail { get; set; }

    public string? BusinessPhone { get; set; }
}