namespace AITasker.Application.DTOs.Requests
{
    public class ResolveDisputeRequest
    {
        public string ResolutionType { get; set; } = string.Empty;

        public decimal ExpertAmount { get; set; }

        public decimal ClientAmount { get; set; }

        public string AdminDecision { get; set; } = string.Empty;
    }
}