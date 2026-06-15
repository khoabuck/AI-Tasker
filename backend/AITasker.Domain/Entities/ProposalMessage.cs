using System;

namespace AITasker.Domain.Entities
{
    public class ProposalMessage
    {
        public int ProposalMessageId { get; set; }

        public int ProposalId { get; set; }

        public int SenderUserId { get; set; }

        public string Content { get; set; } = string.Empty;

        public string MessageType { get; set; } = "TEXT";

        public bool IsAgreementMarked { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Proposal? Proposal { get; set; }

        public User? SenderUser { get; set; }
    }
}