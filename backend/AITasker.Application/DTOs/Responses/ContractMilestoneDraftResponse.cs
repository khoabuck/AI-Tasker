namespace AITasker.Application.DTOs.Responses
{
    public class ContractMilestoneDraftResponse
    {
        public int ContractMilestoneDraftId { get; set; }

        public int ContractId { get; set; }

        public string Title { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int DurationDays { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}