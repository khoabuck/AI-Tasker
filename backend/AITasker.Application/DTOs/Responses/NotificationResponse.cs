namespace AITasker.Application.DTOs.Responses
{
    public class NotificationResponse
    {
        public int NotificationId { get; set; }

        public int UserId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public string Type { get; set; } = string.Empty;

        public string? RelatedEntityType { get; set; }

        public int? RelatedEntityId { get; set; }

        public int? RelatedJobId { get; set; }

        public int? RelatedProposalId { get; set; }

        public int? RelatedContractId { get; set; }

        public int? RelatedProjectId { get; set; }

        public int? RelatedMilestoneId { get; set; }

        public int? RelatedDeliverableId { get; set; }

        public int? RelatedDisputeId { get; set; }

        public int? RelatedConversationId { get; set; }

        public bool IsRead { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        public string TimeZone { get; set; } = "Asia/Ho_Chi_Minh";
    }
}