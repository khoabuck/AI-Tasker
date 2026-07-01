using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IPayOsPayoutService
    {
        Task<PayOsPayoutCreateResult> CreateSinglePayoutAsync(PayOsPayoutCreateRequest request);

        Task<PayOsPayoutDetailResult> GetPayoutAsync(string payoutId);

        Task<PayOsPayoutAccountBalanceResponse> GetPayoutAccountBalanceAsync();
    }

    public class PayOsPayoutCreateRequest
    {
        public string ReferenceId { get; set; } = string.Empty;

        public long Amount { get; set; }

        public string Description { get; set; } = string.Empty;

        public string ToBin { get; set; } = string.Empty;

        public string ToAccountNumber { get; set; } = string.Empty;

        public IReadOnlyList<string> Category { get; set; } = new[] { "withdrawal" };

        public string IdempotencyKey { get; set; } = string.Empty;
    }

    public class PayOsPayoutCreateResult
    {
        public string PayoutId { get; set; } = string.Empty;

        public string ReferenceId { get; set; } = string.Empty;

        public string ApprovalState { get; set; } = string.Empty;

        public PayOsPayoutTransactionResult? FirstTransaction { get; set; }

        public string RawResponse { get; set; } = string.Empty;
    }

    public class PayOsPayoutDetailResult
    {
        public string PayoutId { get; set; } = string.Empty;

        public string ReferenceId { get; set; } = string.Empty;

        public string ApprovalState { get; set; } = string.Empty;

        public PayOsPayoutTransactionResult? FirstTransaction { get; set; }

        public string RawResponse { get; set; } = string.Empty;
    }

    public class PayOsPayoutTransactionResult
    {
        public string TransactionId { get; set; } = string.Empty;

        public string ReferenceId { get; set; } = string.Empty;

        public long Amount { get; set; }

        public string ToBin { get; set; } = string.Empty;

        public string ToAccountNumber { get; set; } = string.Empty;

        public string? ToAccountName { get; set; }

        public string State { get; set; } = string.Empty;

        public string? ErrorCode { get; set; }

        public string? ErrorMessage { get; set; }
    }
}
