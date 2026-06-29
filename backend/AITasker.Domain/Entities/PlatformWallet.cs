namespace AITasker.Domain.Entities
{
    public class PlatformWallet
    {
        public int PlatformWalletId { get; set; }

        public string WalletCode { get; set; } = "MAIN";

        public decimal AvailableBalance { get; set; }

        public decimal TotalRevenue { get; set; }

        public decimal PlatformFeeRevenue { get; set; }

        public decimal WithdrawalFeeRevenue { get; set; }

        public decimal AdjustmentBalance { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<PlatformTransaction> Transactions { get; set; } = new List<PlatformTransaction>();
    }
}