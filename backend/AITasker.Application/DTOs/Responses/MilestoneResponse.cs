namespace AITasker.Application.DTOs.Responses
{
    public class MilestoneResponse
    {
        public int MilestoneId { get; set; }

        public int ProjectId { get; set; }

        public string ProjectTitle { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int OrderIndex { get; set; }

        public int DurationDays { get; set; }

        public DateTime Deadline { get; set; }

        public int RevisionUsed { get; set; }

        public string PaymentStatus { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}