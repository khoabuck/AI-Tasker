namespace AITasker.Application.DTOs.Responses
{
    public class DepositOrderResponse
    {
        public int DepositOrderId { get; set; }

        public int UserId { get; set; }

        public string OrderCode { get; set; } = string.Empty;

        public long? PayOsOrderCode { get; set; }

        public decimal Amount { get; set; }

        public string Provider { get; set; } = string.Empty;

        public string PaymentContent { get; set; } = string.Empty;

        public string QrContent { get; set; } = string.Empty;

        public string? CheckoutUrl { get; set; }

        public string? PaymentLinkId { get; set; }

        public string? ReturnUrl { get; set; }

        public string? CancelUrl { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? ProviderReference { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime ExpiresAt { get; set; }

        public DateTime? PaidAt { get; set; }

        public WalletResponse? WalletAfterPayment { get; set; }
    }
}