namespace AITasker.Application.DTOs.Requests;

public class AdminSetFreeProposalSubmitRequest
{
    public bool FreeProposalSubmitUsed { get; set; }

    public string Reason { get; set; } = string.Empty;
}