namespace AITasker.Application.DTOs.Responses
{
    public class AdminUserWalletResponse
    {
        public int WalletId { get; set; }

        public int UserId { get; set; }

        public string Email { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? Role { get; set; }

        public string UserStatus { get; set; } = string.Empty;

        public decimal AvailableBalance { get; set; }

        public decimal LockedBalance { get; set; }

        public decimal PendingEarningsBalance { get; set; }

        public decimal WithdrawableBalance { get; set; }

        public decimal TotalEarning { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}