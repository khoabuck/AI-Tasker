using System;
using System.Collections.Generic;

namespace AITasker.Domain.Entities
{
    public class Conversation
    {
        public int ConversationId { get; set; }

        public string ConversationType { get; set; } = "DIRECT_CONTACT";

        public int CreatedByUserId { get; set; }

        public int? ClientUserId { get; set; }

        public int? ExpertUserId { get; set; }

        public int? RelatedJobId { get; set; }

        public int? RelatedProposalId { get; set; }

        public int? RelatedContractId { get; set; }

        public int? RelatedProjectId { get; set; }

        public int? RelatedMilestoneId { get; set; }

        public int? RelatedDisputeId { get; set; }

        public string Status { get; set; } = "ACTIVE";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastMessageAt { get; set; }

        public User? CreatedByUser { get; set; }

        public User? ClientUser { get; set; }

        public User? ExpertUser { get; set; }

        public JobPosting? RelatedJob { get; set; }

        public Proposal? RelatedProposal { get; set; }

        public ProjectContract? RelatedContract { get; set; }

        public Project? RelatedProject { get; set; }

        public Milestone? RelatedMilestone { get; set; }

        public Dispute? RelatedDispute { get; set; }

        public ICollection<ConversationMessage> Messages { get; set; } = new List<ConversationMessage>();
    }
}