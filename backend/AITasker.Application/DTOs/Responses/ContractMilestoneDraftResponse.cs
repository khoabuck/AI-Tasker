namespace AITasker.Application.DTOs.Responses
{
    public class ContractMilestoneDraftResponse
    {
        public int ContractMilestoneDraftId { get; set; }

        public int ContractId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string ExpectedDeliverable { get; set; } = string.Empty;

        public string AcceptanceCriteria { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int OrderIndex { get; set; }

        public int DeadlineOffsetDays { get; set; }

        public int RevisionLimit { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}