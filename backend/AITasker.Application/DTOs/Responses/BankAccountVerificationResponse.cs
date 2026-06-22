namespace AITasker.Application.DTOs.Responses
{
    public class BankAccountVerificationResponse
    {
        public bool IsValid { get; set; }

        public string Provider { get; set; } = string.Empty;

        public string BankCode { get; set; } = string.Empty;

        public string BankName { get; set; } = string.Empty;

        public string BankAccountNumber { get; set; } = string.Empty;

        public string BankAccountHolder { get; set; } = string.Empty;

        public string NormalizedBankAccountHolder { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public DateTime CheckedAt { get; set; }
    }
}