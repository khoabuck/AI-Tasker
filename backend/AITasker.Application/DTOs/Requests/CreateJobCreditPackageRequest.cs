namespace AITasker.Application.DTOs.Requests;

public class CreateJobCreditPackageRequest
{
    public string PackageName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int JobPostCredits { get; set; }

    public int AiGenerationCredits { get; set; }

    public decimal Price { get; set; }

    public string Currency { get; set; } = "VND";

    public bool IsActive { get; set; } = true;

    public int DisplayOrder { get; set; }

    public string? Reason { get; set; }
}
