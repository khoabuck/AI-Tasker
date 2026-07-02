namespace AITasker.Application.DTOs.Responses
{
    public class AdminFinanceOverviewResponse
    {
        public DateTime GeneratedAt { get; set; }

        public decimal PlatformAvailableBalance { get; set; }

        public decimal PlatformTotalRevenue { get; set; }

        public decimal PlatformFeeRevenue { get; set; }

        public decimal WithdrawalFeeRevenue { get; set; }

        public decimal AdjustmentBalance { get; set; }

        public decimal TotalUserAvailableBalance { get; set; }

        public decimal TotalUserLockedBalance { get; set; }

        public decimal TotalExpertPendingEarningsBalance { get; set; }

        public decimal TotalExpertEarnings { get; set; }

        public decimal TotalEscrowLocked { get; set; }

        public decimal TotalEscrowFrozen { get; set; }

        public decimal TotalEscrowReleased { get; set; }

        public decimal TotalEscrowRefunded { get; set; }

        public decimal PendingWithdrawalAmount { get; set; }

        public int PendingWithdrawalCount { get; set; }

        public decimal PaidWithdrawalAmount { get; set; }

        public int PaidWithdrawalCount { get; set; }

        public decimal RejectedWithdrawalAmount { get; set; }

        public int RejectedWithdrawalCount { get; set; }

        public decimal FailedWithdrawalAmount { get; set; }

        public int FailedWithdrawalCount { get; set; }
    }
}
