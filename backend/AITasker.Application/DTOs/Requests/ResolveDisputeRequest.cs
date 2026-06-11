namespace AITasker.Application.DTOs.Requests
{
    public class ResolveDisputeRequest
    {
        public string? ResolutionType { get; set; }
        
        public decimal ExpertAmount { get; set; }
        
        public decimal ClientAmount { get; set; }
    }
}