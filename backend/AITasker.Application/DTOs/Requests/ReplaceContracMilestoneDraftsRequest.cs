namespace AITasker.Application.DTOs.Requests
{
    public class ReplaceContractMilestoneDraftsRequest
    {
        public List<ContractMilestoneDraftItemRequest> Milestones { get; set; } = new();
    }

    public class ContractMilestoneDraftItemRequest
    {
        public string Title { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int DurationDays { get; set; }
    }
}
