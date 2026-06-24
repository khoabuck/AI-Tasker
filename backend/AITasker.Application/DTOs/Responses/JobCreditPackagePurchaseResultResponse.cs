namespace AITasker.Application.DTOs.Responses;

public class JobCreditPackagePurchaseResultResponse
{
    public JobCreditPackagePurchaseResponse Purchase { get; set; } = null!;

    public decimal RemainingWalletBalance { get; set; }

    public int RemainingFreeJobPostCredits { get; set; }

    public int RemainingPaidJobPostCredits { get; set; }

    public int RemainingFreeAiGenerationCredits { get; set; }

    public int RemainingPaidAiGenerationCredits { get; set; }
}
