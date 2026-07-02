namespace AITasker.Application.DTOs.Requests
{
    public class ProcessWithdrawalRequest
    {
        public string? PayoutReferenceCode { get; set; }

        public string? AdminNote { get; set; }
    }
}
