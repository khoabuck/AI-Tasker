namespace AITasker.Application.DTOs.Requests;

public class AdminAdjustProposalCreditsRequest
{
    public int CreditDelta { get; set; }

    public string Reason { get; set; } = string.Empty;
}