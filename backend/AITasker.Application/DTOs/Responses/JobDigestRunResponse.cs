namespace AITasker.Application.DTOs.Responses
{
    public class JobDigestRunResponse
    {
        public DateTime WindowStart { get; set; }

        public DateTime WindowEnd { get; set; }

        public DateTime WindowStartUtc { get; set; }

        public DateTime WindowEndUtc { get; set; }

        public string TimeZone { get; set; } = "Asia/Ho_Chi_Minh";

        public int NewJobCount { get; set; }

        public int ExpertRecipientCount { get; set; }

        public int NotificationCreatedCount { get; set; }

        public bool SkippedBecauseNoJobs { get; set; }
    }
}