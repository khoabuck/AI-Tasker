namespace AITasker.Application.DTOs.Requests
{
    public class ResolveReviewReportRequest
    {
        // ACCEPT / REJECT
        public string Decision { get; set; } = string.Empty;

        public string AdminDecision { get; set; } = string.Empty;
    }
}
