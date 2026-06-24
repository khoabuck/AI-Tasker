using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Constants;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AITasker.Infrastructure.Notifications
{
    public class JobDigestNotificationService : IJobDigestNotificationService
    {
        private const string VietnamTimeZoneName = "Asia/Ho_Chi_Minh";
        private const string JobStatusOpen = "OPEN";
        private const string ExpertRole = "EXPERT";
        private const string UserStatusActive = "ACTIVE";

        private readonly AITaskerDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ILogger<JobDigestNotificationService> _logger;

        public JobDigestNotificationService(
            AITaskerDbContext context,
            INotificationService notificationService,
            ILogger<JobDigestNotificationService> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<JobDigestRunResponse> SendDailyJobDigestAsync(
            DateTime? windowEndUtc = null)
        {
            var actualWindowEndUtc = NormalizeUtc(windowEndUtc ?? DateTime.UtcNow);
            var actualWindowStartUtc = actualWindowEndUtc.AddHours(-24);

            var newJobCount = await _context.JobPostings
                .AsNoTracking()
                .CountAsync(j =>
                    j.Status == JobStatusOpen &&
                    j.CreatedAt >= actualWindowStartUtc &&
                    j.CreatedAt < actualWindowEndUtc);

            var response = new JobDigestRunResponse
            {
                WindowStartUtc = actualWindowStartUtc,
                WindowEndUtc = actualWindowEndUtc,
                WindowStart = ConvertUtcToVietnamTime(actualWindowStartUtc),
                WindowEnd = ConvertUtcToVietnamTime(actualWindowEndUtc),
                TimeZone = VietnamTimeZoneName,
                NewJobCount = newJobCount,
                SkippedBecauseNoJobs = newJobCount == 0
            };

            if (newJobCount == 0)
            {
                _logger.LogInformation(
                    "Job digest skipped because no new OPEN jobs. WindowStartUtc={WindowStartUtc}, WindowEndUtc={WindowEndUtc}",
                    actualWindowStartUtc,
                    actualWindowEndUtc);

                return response;
            }

            var expertUserIds = await _context.ExpertProfiles
                .AsNoTracking()
                .Where(e =>
                    e.AvailableForWork &&
                    e.User.Role == ExpertRole &&
                    e.User.Status == UserStatusActive)
                .Select(e => e.UserId)
                .Distinct()
                .ToListAsync();

            response.ExpertRecipientCount = expertUserIds.Count;

            var createdCount = 0;

            foreach (var expertUserId in expertUserIds)
            {
                var alreadySent = await HasDigestAlreadySentAsync(
                    expertUserId,
                    actualWindowEndUtc);

                if (alreadySent)
                {
                    continue;
                }

                await _notificationService.CreateNotificationAsync(
                    expertUserId,
                    "New jobs available",
                    $"There are {newJobCount} new job(s) posted from {response.WindowStart:dd/MM/yyyy HH:mm} to {response.WindowEnd:dd/MM/yyyy HH:mm}. Open this notification to view up to 10 latest jobs.",
                    NotificationTypes.JobDailyDigest);

                createdCount++;
            }

            response.NotificationCreatedCount = createdCount;

            _logger.LogInformation(
                "Job digest completed. NewJobCount={NewJobCount}, ExpertRecipientCount={ExpertRecipientCount}, NotificationCreatedCount={NotificationCreatedCount}",
                response.NewJobCount,
                response.ExpertRecipientCount,
                response.NotificationCreatedCount);

            return response;
        }

        private async Task<bool> HasDigestAlreadySentAsync(
            int userId,
            DateTime windowEndUtc)
        {
            var lowerBound = windowEndUtc.AddHours(-1);
            var upperBound = windowEndUtc.AddHours(1);

            return await _context.Notifications
                .AsNoTracking()
                .AnyAsync(n =>
                    n.UserId == userId &&
                    n.Type == NotificationTypes.JobDailyDigest &&
                    n.CreatedAt >= lowerBound &&
                    n.CreatedAt < upperBound);
        }

        private static DateTime NormalizeUtc(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc)
            {
                return value;
            }

            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        private static DateTime ConvertUtcToVietnamTime(DateTime utcDateTime)
        {
            return utcDateTime.AddHours(7);
        }
    }
}