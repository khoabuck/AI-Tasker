namespace AITasker.Application.DTOs.Requests
{
    public class OpenDisputeRequest
    {
        public int ProjectId { get; set; }

        public int? MilestoneId { get; set; }

        public int? RespondentUserId { get; set; }

        public decimal DisputedAmount { get; set; }

        public string Reason { get; set; } = string.Empty;

        public string? EvidenceText { get; set; }

        public string? EvidenceFileUrl { get; set; }
    }
}