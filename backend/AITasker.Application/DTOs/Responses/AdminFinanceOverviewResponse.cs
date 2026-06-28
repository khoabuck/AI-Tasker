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

        public decimal TotalExpertEarnings { get; set; }

        public decimal TotalEscrowLocked { get; set; }

        public decimal TotalEscrowFrozen { get; set; }

        public decimal TotalEscrowReleased { get; set; }

        public decimal TotalEscrowRefunded { get; set; }

        public decimal PendingWithdrawalAmount { get; set; }

        public int PendingWithdrawalCount { get; set; }

        public decimal ApprovedWithdrawalAmount { get; set; }

        public int ApprovedWithdrawalCount { get; set; }

        public decimal PaidSimulatedWithdrawalAmount { get; set; }

        public int PaidSimulatedWithdrawalCount { get; set; }
    }
}