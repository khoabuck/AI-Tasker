namespace AITasker.Application.DTOs.Requests
{
    public class BankAccountVerificationRequest
    {
        public string BankCode { get; set; } = string.Empty;

        public string BankBin { get; set; } = string.Empty;

        public string BankName { get; set; } = string.Empty;

        public string BankAccountNumber { get; set; } = string.Empty;

        public string BankAccountHolder { get; set; } = string.Empty;
    }
}