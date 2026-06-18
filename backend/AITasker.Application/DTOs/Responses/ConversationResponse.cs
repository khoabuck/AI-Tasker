namespace AITasker.Application.DTOs.Responses
{
    public class ConversationResponse
    {
        public int ConversationId { get; set; }

        public string ConversationType { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public int CreatedByUserId { get; set; }

        public int? ClientUserId { get; set; }

        public string? ClientName { get; set; }

        public int? ExpertUserId { get; set; }

        public string? ExpertName { get; set; }

        public int? RelatedJobId { get; set; }

        public string? RelatedJobTitle { get; set; }

        public int? RelatedProposalId { get; set; }

        public int? RelatedContractId { get; set; }

        public int? RelatedProjectId { get; set; }

        public string? RelatedProjectTitle { get; set; }

        public int? RelatedMilestoneId { get; set; }

        public string? RelatedMilestoneTitle { get; set; }

        public int? RelatedDisputeId { get; set; }

        public string? LastMessageContent { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? LastMessageAt { get; set; }
    }
}