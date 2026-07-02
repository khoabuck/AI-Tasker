namespace AITasker.Application.DTOs.Responses
{
    public class WalletResponse
    {
        public int WalletId { get; set; }

        public int UserId { get; set; }

        public decimal AvailableBalance { get; set; }

        public decimal LockedBalance { get; set; }

        public decimal PendingEarningsBalance { get; set; }

        public decimal WithdrawableBalance { get; set; }

        public decimal TotalEarning { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}