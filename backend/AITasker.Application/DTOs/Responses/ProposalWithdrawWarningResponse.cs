namespace AITasker.Application.DTOs.Responses;

public class ProposalWithdrawWarningResponse
{
    public int ProposalId { get; set; }

    public bool WillLoseReservedCredit { get; set; }

    public string ProposalCreditChargeType { get; set; } = string.Empty;

    public string ProposalCreditChargeStatus { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}