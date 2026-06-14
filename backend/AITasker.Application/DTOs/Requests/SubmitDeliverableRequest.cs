namespace AITasker.Application.DTOs.Requests
{
    public class SubmitDeliverableRequest
    {
        public int MilestoneId { get; set; }
        
        public string? FileUrl { get; set; }
        
        public string? DemoUrl { get; set; }
        
        public string? Description { get; set; }

        public string? TestResultUrl { get; set; }
    }
}