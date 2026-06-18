namespace AITasker.Application.DTOs.Requests
{
    public class ReplaceContractMilestoneDraftsRequest
    {
        public List<ContractMilestoneDraftItemRequest> Milestones { get; set; } = new();
    }

    public class ContractMilestoneDraftItemRequest
    {
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string ExpectedDeliverable { get; set; } = string.Empty;

        public string AcceptanceCriteria { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int OrderIndex { get; set; }

        public int DeadlineOffsetDays { get; set; }

        public int RevisionLimit { get; set; }
    }
}