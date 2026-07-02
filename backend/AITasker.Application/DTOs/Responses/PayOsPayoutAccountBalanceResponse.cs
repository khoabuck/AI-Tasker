namespace AITasker.Application.DTOs.Responses
{
    public class PayOsPayoutAccountBalanceResponse
    {
        public string AccountNumber { get; set; } = string.Empty;

        public string AccountName { get; set; } = string.Empty;

        public string Currency { get; set; } = "VND";

        public decimal Balance { get; set; }
    }
}
