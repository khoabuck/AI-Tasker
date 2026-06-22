using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IJobDigestNotificationService
    {
        Task<JobDigestRunResponse> SendDailyJobDigestAsync(
            DateTime? windowEndUtc = null);
    }
}