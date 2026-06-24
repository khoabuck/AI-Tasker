namespace AITasker.Application.DTOs.Responses
{
    public class ProjectContractResponse
    {
        public int ContractId { get; set; }

        public int ProposalId { get; set; }

        public int SourceProposalVersionNumber { get; set; }

        public int JobId { get; set; }

        public string JobTitle { get; set; } = string.Empty;

        public int ClientProfileId { get; set; }

        public int ClientUserId { get; set; }

        public string ClientName { get; set; } = string.Empty;

        public int ExpertProfileId { get; set; }

        public int ExpertUserId { get; set; }

        public string ExpertName { get; set; } = string.Empty;

        public string ProjectScope { get; set; } = string.Empty;

        public decimal FinalPrice { get; set; }

        public decimal PlatformFeeRate { get; set; }

        public decimal PlatformFeeAmount { get; set; }

        public decimal TotalClientPayment { get; set; }

        public decimal ExpertReceivableAmount { get; set; }

        public int FinalTimelineDays { get; set; }

        public string Deliverables { get; set; } = string.Empty;

        public string AcceptanceCriteria { get; set; } = string.Empty;

        public string PaymentTerms { get; set; } = string.Empty;

        public string ContractSource { get; set; } = string.Empty;

        public string? ChatSummary { get; set; }

        public bool ClientConfirmed { get; set; }

        public bool ExpertConfirmed { get; set; }

        public string Status { get; set; } = string.Empty;

        public int? ProjectId { get; set; }

        public string? ProjectStatus { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ConfirmedAt { get; set; }
    }
}