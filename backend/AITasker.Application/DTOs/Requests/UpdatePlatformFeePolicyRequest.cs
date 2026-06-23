namespace AITasker.Application.DTOs.Requests;

public class UpdatePlatformFeePolicyRequest
{
    public decimal IndividualClientFeeRate { get; set; }

    public decimal BusinessClientFeeRate { get; set; }

    public string? Reason { get; set; }
}
