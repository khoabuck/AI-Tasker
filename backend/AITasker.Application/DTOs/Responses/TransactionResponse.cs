namespace AITasker.Application.DTOs.Responses
{
    public class TransactionResponse
    {
        public int TransactionId { get; set; }

        public int? EscrowId { get; set; }

        public int? ProjectId { get; set; }

        public string? ProjectTitle { get; set; }

        public int? MilestoneId { get; set; }

        public string? MilestoneTitle { get; set; }

        public int? ContractId { get; set; }

        public string? ContractTitle { get; set; }

        public int? ProposalId { get; set; }

        public string? ProposalTitle { get; set; }

        public int? JobId { get; set; }

        public string? JobTitle { get; set; }

        public int UserId { get; set; }

        public string Type { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;

        public string StatusGroup { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public string Status { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string? DisplayTitle { get; set; }

        public string? DisplaySubtitle { get; set; }

        public string? DisplayDescription { get; set; }

        public string? ReferenceType { get; set; }

        public string? ReferenceDisplayName { get; set; }

        public string? ReferenceId { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
