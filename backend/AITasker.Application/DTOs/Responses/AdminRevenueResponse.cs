namespace AITasker.Application.DTOs.Responses
{
    public class AdminRevenueResponse
    {
        public DateTime GeneratedAt { get; set; }

        public decimal TotalContractValue { get; set; }

        public decimal TotalClientPaymentExpected { get; set; }

        public decimal PlatformFeeExpected { get; set; }

        public decimal PlatformFeeCollected { get; set; }

        public decimal TotalEscrowLocked { get; set; }

        public decimal TotalEscrowFrozen { get; set; }

        public decimal TotalEscrowReleased { get; set; }

        public decimal TotalEscrowRefunded { get; set; }

        public decimal TotalExpertPayout { get; set; }

        public decimal TotalClientRefund { get; set; }

        public decimal PendingWithdrawalAmount { get; set; }

        public decimal ApprovedWithdrawalAmount { get; set; }

        public List<AdminRevenueTransactionItemResponse> RecentTransactions { get; set; } = new();
    }

    public class AdminRevenueTransactionItemResponse
    {
        public int TransactionId { get; set; }

        public int UserId { get; set; }

        public int? ProjectId { get; set; }

        public int? MilestoneId { get; set; }

        public int? EscrowId { get; set; }

        public string Type { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string Status { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string? ReferenceId { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}