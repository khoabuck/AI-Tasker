namespace AITasker.Application.DTOs.Responses;

public class AdminProposalCreditResponse
{
    public int ExpertProfileId { get; set; }

    public int UserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string ProfessionalTitle { get; set; } = string.Empty;

    public string ProfileReviewStatus { get; set; } = string.Empty;

    public bool AvailableForWork { get; set; }

    public int FreeProposalSubmitTotal { get; set; }

    public int FreeProposalSubmitUsedCount { get; set; }

    public int FreeProposalSubmitRemaining { get; set; }

    public int ProposalSubmitCredits { get; set; }

    public bool CanSubmitProposal { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}