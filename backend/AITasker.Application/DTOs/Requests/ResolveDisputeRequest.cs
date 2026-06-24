namespace AITasker.Application.DTOs.Requests
{
    public class ResolveDisputeRequest
    {
        public string ResolutionType { get; set; } = string.Empty;

        public string AdminDecision { get; set; } = string.Empty;
    }
}