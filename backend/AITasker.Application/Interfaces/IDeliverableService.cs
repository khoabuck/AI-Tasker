using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IDeliverableService
    {
        Task<DeliverableResponse> SubmitDeliverableAsync(
            int expertUserId,
            SubmitDeliverableRequest request);

        Task<IReadOnlyList<DeliverableResponse>> GetMilestoneDeliverablesAsync(
            int currentUserId,
            int milestoneId);

        Task<DeliverableResponse> GetDeliverableByIdAsync(
            int currentUserId,
            int deliverableId);

        Task<DeliverableResponse> ApproveDeliverableAsync(
            int deliverableId,
            int clientUserId);

        Task<DeliverableResponse> RequestRevisionAsync(
            int deliverableId,
            int clientUserId,
            RevisionRequest request);
    }
}