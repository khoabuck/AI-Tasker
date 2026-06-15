namespace AITasker.Application.DTOs.Responses
{
    public class EscrowOperationResponse
    {
        public bool Success { get; set; }

        public string Message { get; set; } = string.Empty;

        public int ProjectId { get; set; }

        public int? MilestoneId { get; set; }

        public decimal Amount { get; set; }

        public decimal PlatformFeeAmount { get; set; }

        public decimal TotalClientPayment { get; set; }

        public string ProjectStatus { get; set; } = string.Empty;

        public string? MilestoneStatus { get; set; }

        public string? MilestonePaymentStatus { get; set; }

        public List<EscrowResponse> Escrows { get; set; } = new();
    }
}