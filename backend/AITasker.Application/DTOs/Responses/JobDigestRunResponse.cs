namespace AITasker.Application.DTOs.Responses
{
    public class JobDigestRunResponse
    {
        public DateTime WindowStart { get; set; }
        public DateTime WindowEnd { get; set; }
        public int NewJobCount { get; set; }
        public int ExpertRecipientCount { get; set; }
        public int NotificationCreatedCount { get; set; }
        public bool SkippedBecauseNoJobs { get; set; }
    }
}
