namespace AITasker.Application.Interfaces;

public interface IProjectCompletionService
{
    Task<bool> TryCompleteProjectAsync(
        int projectId,
        bool throwIfNotReady = false,
        bool sendNotifications = true);
}
