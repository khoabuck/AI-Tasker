using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IContractFailureRollbackService
{
    Task ReopenJobAfterContractFailureAsync(
        ProjectContract contract,
        string failureReason,
        DateTime now,
        CancellationToken cancellationToken = default);
}
