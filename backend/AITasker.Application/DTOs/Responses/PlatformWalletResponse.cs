namespace AITasker.Application.DTOs.Responses
{
    public class PlatformWalletResponse
    {
        public int PlatformWalletId { get; set; }

        public string WalletCode { get; set; } = string.Empty;

        public decimal AvailableBalance { get; set; }

        public decimal TotalRevenue { get; set; }

        public decimal PlatformFeeRevenue { get; set; }

        public decimal WithdrawalFeeRevenue { get; set; }

        public decimal AdjustmentBalance { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}