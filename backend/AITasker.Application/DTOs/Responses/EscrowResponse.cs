namespace AITasker.Application.DTOs.Responses
{
    public class EscrowResponse
    {
        public int EscrowId { get; set; }

        public int ProjectId { get; set; }

        public string ProjectTitle { get; set; } = string.Empty;

        public int? MilestoneId { get; set; }

        public string? MilestoneTitle { get; set; }

        public int ClientProfileId { get; set; }

        public int ClientUserId { get; set; }

        public decimal Amount { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}