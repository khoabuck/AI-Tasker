namespace AITasker.Domain.Entities
{
    public class WithdrawalRequest
    {
        public int WithdrawalRequestId { get; set; }

        public int UserId { get; set; }

        public decimal Amount { get; set; }

        public string BankName { get; set; } = string.Empty;

        public string BankAccountNumber { get; set; } = string.Empty;

        public string BankAccountHolder { get; set; } = string.Empty;

        public string Status { get; set; } = "PENDING";

        public string? AdminNote { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ProcessedAt { get; set; }

        public int? ProcessedByAdminId { get; set; }

        public virtual User User { get; set; } = null!;

        public virtual User? ProcessedByAdmin { get; set; }
    }
}