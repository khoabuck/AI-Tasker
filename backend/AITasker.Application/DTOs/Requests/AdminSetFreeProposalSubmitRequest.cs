namespace AITasker.Application.DTOs.Requests;

public class AdminSetFreeProposalSubmitRequest
{
    public int FreeProposalSubmitUsedCount { get; set; }

    public string Reason { get; set; } = string.Empty;
}