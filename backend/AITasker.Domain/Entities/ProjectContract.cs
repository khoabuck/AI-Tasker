using System;
using System.Collections.Generic;

namespace AITasker.Domain.Entities
{
    public class ProjectContract
    {
        public int ContractId { get; set; }

        public int ProposalId { get; set; }

        public int SourceProposalVersionNumber { get; set; } = 1;

        public int ClientId { get; set; }

        public int ExpertId { get; set; }

        public string ProjectScope { get; set; } = string.Empty;

        public decimal FinalPrice { get; set; }

        public decimal PlatformFeeRate { get; set; }

        public decimal PlatformFeeAmount { get; set; }

        public decimal TotalClientPayment { get; set; }

        public decimal ExpertFeeRate { get; set; }

        public decimal ExpertFeeAmount { get; set; }

        public decimal ExpertReceivableAmount { get; set; }

        public int FinalTimelineDays { get; set; }

        public string Deliverables { get; set; } = string.Empty;

        public string AcceptanceCriteria { get; set; } = string.Empty;

        public string PaymentTerms { get; set; } = string.Empty;

        public string ContractSource { get; set; } = "PROPOSAL";

        public string? ChatSummary { get; set; }

        public bool ClientConfirmed { get; set; } = false;

        public bool ExpertConfirmed { get; set; } = false;

        public string Status { get; set; } = "DRAFT";

        public DateTime? SignDeadlineAt { get; set; }

        public DateTime? SignExpiredAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ConfirmedAt { get; set; }

        public Proposal? Proposal { get; set; }

        public ClientProfile? ClientProfile { get; set; }

        public ExpertProfile? ExpertProfile { get; set; }

        public Project? Project { get; set; }

        public ICollection<ContractMilestoneDraft> MilestoneDrafts { get; set; } = new List<ContractMilestoneDraft>();
    }
}