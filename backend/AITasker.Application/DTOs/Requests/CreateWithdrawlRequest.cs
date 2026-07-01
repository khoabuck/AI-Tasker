namespace AITasker.Application.DTOs.Requests
{
    public class CreateWithdrawalRequest
    {
        public decimal Amount { get; set; }

        public string BankName { get; set; } = string.Empty;

        public string BankAccountNumber { get; set; } = string.Empty;

        public string BankAccountHolder { get; set; } = string.Empty;
    }
}
