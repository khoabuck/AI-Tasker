namespace AITasker.Domain.Entities
{
    public class PlatformTransaction
    {
        public int PlatformTransactionId { get; set; }

        public int PlatformWalletId { get; set; }

        public int? ProjectId { get; set; }

        public int? ContractId { get; set; }

        public int? WithdrawalRequestId { get; set; }

        public int? UserId { get; set; }

        public string Type { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string Status { get; set; } = "SUCCESS";

        public string Description { get; set; } = string.Empty;

        public string? ReferenceId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public PlatformWallet PlatformWallet { get; set; } = null!;

        public User? User { get; set; }

        public Project? Project { get; set; }

        public ProjectContract? Contract { get; set; }

        public WithdrawalRequest? WithdrawalRequest { get; set; }
    }
}