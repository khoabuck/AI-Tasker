namespace AITasker.Application.DTOs.Requests
{
    public class CreateContractRequest
    {
        public int ProposalId { get; set; }
        
        public string ProjectScope { get; set; } = string.Empty;
        
        public decimal FinalPrice { get; set; }
        
        public int FinalTimelineDays { get; set; }
        
        public string Deliverables { get; set; } = string.Empty;
        
        public string AcceptanceCriteria { get; set; } = string.Empty;
        
        public int RevisionLimit { get; set; }
        
        public string PaymentTerms { get; set; } = string.Empty;
    }
}