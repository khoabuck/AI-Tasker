namespace AITasker.Application.DTOs.Requests
{
    public class CreateConversationRequest
    {
        public string? ConversationType { get; set; }

        public int? ClientUserId { get; set; }

        public int? ExpertUserId { get; set; }

        public int? ClientProfileId { get; set; }

        public int? ExpertProfileId { get; set; }

        public int? RelatedJobId { get; set; }

        public int? RelatedProposalId { get; set; }

        public int? RelatedContractId { get; set; }

        public int? RelatedProjectId { get; set; }

        public int? RelatedMilestoneId { get; set; }

        public int? RelatedDisputeId { get; set; }

        public string? InitialMessage { get; set; }
    }
}