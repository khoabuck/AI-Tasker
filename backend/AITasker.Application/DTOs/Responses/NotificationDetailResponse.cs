namespace AITasker.Application.DTOs.Responses
{
    public class NotificationDetailResponse
    {
        public NotificationResponse Notification { get; set; } = new();
        public JobDigestNotificationPayload? JobDigest { get; set; }
    }

    public class JobDigestNotificationPayload
    {
        public DateTime WindowStart { get; set; }
        public DateTime WindowEnd { get; set; }
        public int TotalJobs { get; set; }
        public int DisplayedJobs { get; set; }
        public List<JobDigestJobItemResponse> Jobs { get; set; } = new();
    }

    public class JobDigestJobItemResponse
    {
        public int JobPostingId { get; set; }
        public string Title { get; set; } = string.Empty;
        public decimal BudgetMin { get; set; }
        public decimal BudgetMax { get; set; }
        public string ProjectType { get; set; } = string.Empty;
        public string Complexity { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime Deadline { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<JobSkillResponse> Skills { get; set; } = new();
    }
}
