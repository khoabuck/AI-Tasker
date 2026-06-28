namespace AITasker.Application.DTOs.Requests;

public class UpdateProposalCreditPackageRequest
{
    public string PackageName { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int ProposalSubmitCredits { get; set; }

    public decimal Price { get; set; }

    public string Currency { get; set; } = "VND";

    public bool IsActive { get; set; }

    public int DisplayOrder { get; set; }

    public string? Reason { get; set; }
}