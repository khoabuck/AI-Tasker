namespace AITasker.Application.DTOs.Responses
{
    public class AdminEscrowFinanceItemResponse
    {
        public int EscrowId { get; set; }

        public int ProjectId { get; set; }

        public int? MilestoneId { get; set; }

        public int ClientProfileId { get; set; }

        public string ProjectTitle { get; set; } = string.Empty;

        public string? MilestoneTitle { get; set; }

        public string ClientName { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}