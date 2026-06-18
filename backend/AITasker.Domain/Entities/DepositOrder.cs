using System;

namespace AITasker.Domain.Entities
{
    public class DepositOrder
    {
        public int DepositOrderId { get; set; }

        public int UserId { get; set; }

        public string OrderCode { get; set; } = string.Empty;

        public long? PayOsOrderCode { get; set; }

        public decimal Amount { get; set; }

        public string Provider { get; set; } = "PAYOS";

        public string PaymentContent { get; set; } = string.Empty;

        public string QrContent { get; set; } = string.Empty;

        public string? CheckoutUrl { get; set; }

        public string? PaymentLinkId { get; set; }

        public string? ReturnUrl { get; set; }

        public string? CancelUrl { get; set; }

        public string Status { get; set; } = "PENDING";

        public string? ProviderReference { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime ExpiresAt { get; set; }

        public DateTime? PaidAt { get; set; }

        public User? User { get; set; }
    }
}