namespace AITasker.Application.DTOs.Responses;

public class ProposalWithdrawWarningResponse
{
    public int ProposalId { get; set; }

    public bool WillLoseProposalCredit { get; set; }

    public bool CanWithdraw { get; set; }

    public string Message { get; set; } = string.Empty;
}
