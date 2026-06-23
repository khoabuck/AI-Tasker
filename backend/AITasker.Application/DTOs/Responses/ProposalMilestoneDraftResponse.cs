namespace AITasker.Application.DTOs.Responses
{
    public class ProposalMilestoneDraftResponse
    {
        public int ProposalMilestoneDraftId { get; set; }

        public int ProposalId { get; set; }

        public string Title { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        public int DurationDays { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}