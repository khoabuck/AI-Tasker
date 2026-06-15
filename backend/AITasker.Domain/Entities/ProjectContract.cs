using System;

namespace AITasker.Domain.Entities
{
    public class ProjectContract
    {
        public int ContractId { get; set; }

        public int ProposalId { get; set; }

        public int ClientId { get; set; }

        public int ExpertId { get; set; }

        public string ProjectScope { get; set; } = string.Empty;

        public decimal FinalPrice { get; set; }

        public decimal PlatformFeeRate { get; set; }

        public decimal PlatformFeeAmount { get; set; }

        public decimal TotalClientPayment { get; set; }

        public int FinalTimelineDays { get; set; }

        public string Deliverables { get; set; } = string.Empty;

        public string AcceptanceCriteria { get; set; } = string.Empty;

        public int RevisionLimit { get; set; }

        public string PaymentTerms { get; set; } = string.Empty;

        public string ContractSource { get; set; } = "PROPOSAL";

        public string? ChatSummary { get; set; }

        public bool ClientConfirmed { get; set; } = false;

        public bool ExpertConfirmed { get; set; } = false;

        public string Status { get; set; } = "DRAFT";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ConfirmedAt { get; set; }

        public Proposal? Proposal { get; set; }
    }
}