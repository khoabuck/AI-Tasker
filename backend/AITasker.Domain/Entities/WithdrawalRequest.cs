namespace AITasker.Domain.Entities
{
    public class WithdrawalRequest
    {
        public int WithdrawalRequestId { get; set; }

        public int UserId { get; set; }

        public decimal Amount { get; set; }

        public decimal FeeAmount { get; set; }

        public decimal NetAmount { get; set; }

        public string BankCode { get; set; } = string.Empty;

        public string BankBin { get; set; } = string.Empty;

        public string BankName { get; set; } = string.Empty;

        public string BankAccountNumber { get; set; } = string.Empty;

        public string BankAccountHolder { get; set; } = string.Empty;

        public string BankVerificationStatus { get; set; } = "NOT_VERIFIED";

        public string? BankVerificationMessage { get; set; }

        public string? PayoutReferenceCode { get; set; }

        public string? PayoutProvider { get; set; }

        public string? PayOsPayoutId { get; set; }

        public string? PayOsTransactionId { get; set; }

        public string? PayOsReferenceId { get; set; }

        public string? PayOsIdempotencyKey { get; set; }

        public string? PayOsApprovalState { get; set; }

        public string? PayOsTransactionState { get; set; }

        public string? PayOsRawResponse { get; set; }

        public DateTime? PayoutRequestedAt { get; set; }

        public DateTime? PayoutConfirmedAt { get; set; }

        public string? FailureReason { get; set; }

        public string Status { get; set; } = "PENDING";

        public string? AdminNote { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ProcessedAt { get; set; }

        public int? ProcessedByAdminId { get; set; }

        public virtual User User { get; set; } = null!;

        public virtual User? ProcessedByAdmin { get; set; }
    }
}
