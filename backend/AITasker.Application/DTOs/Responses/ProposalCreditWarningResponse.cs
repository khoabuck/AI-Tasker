namespace AITasker.Application.DTOs.Responses;

public class ProposalCreditWarningResponse
{
    public string Code { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string Severity { get; set; } = "INFO";

    public int Remaining { get; set; }

    public int Threshold { get; set; }
}