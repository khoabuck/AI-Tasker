namespace AITasker.Application.DTOs.Responses
{
    public class WithdrawalResponse
    {
        public int WithdrawalRequestId { get; set; }

        public int UserId { get; set; }

        public string UserFullName { get; set; } = string.Empty;

        public string UserEmail { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string BankName { get; set; } = string.Empty;

        public string BankAccountNumber { get; set; } = string.Empty;

        public string BankAccountHolder { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public string? AdminNote { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ProcessedAt { get; set; }

        public int? ProcessedByAdminId { get; set; }
    }
}