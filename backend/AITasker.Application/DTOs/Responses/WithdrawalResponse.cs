namespace AITasker.Application.DTOs.Responses
{
    public class WithdrawalResponse
    {
        public int WithdrawalRequestId { get; set; }

        public int UserId { get; set; }

        public string UserFullName { get; set; } = string.Empty;

        public string UserEmail { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public decimal FeeAmount { get; set; }

        public decimal NetAmount { get; set; }

        public string BankCode { get; set; } = string.Empty;

        public string BankName { get; set; } = string.Empty;

        public string BankAccountNumber { get; set; } = string.Empty;

        public string BankAccountHolder { get; set; } = string.Empty;

        public string BankVerificationStatus { get; set; } = string.Empty;

        public string? BankVerificationMessage { get; set; }

        public string? PayoutReferenceCode { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? AdminNote { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ProcessedAt { get; set; }

        public int? ProcessedByAdminId { get; set; }
    }
}