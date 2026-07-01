using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IExpertEarningEscrowService
{
    Task<decimal> GetPendingEarningsForProjectAsync(
        int projectId,
        int expertUserId);

    Task<decimal> ReleaseProjectPendingEarningsAsync(
        Project project,
        ExpertProfile expertProfile);

    Task<decimal> RefundProjectPendingEarningsToClientAsync(
        Project project,
        ExpertProfile expertProfile,
        ClientProfile clientProfile,
        int? disputeId = null);
}
