using System.Threading.Tasks;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces
{
    public interface IDeliverableService
    {
        Task<Deliverable?> SubmitDeliverableAsync(
            int milestoneId,
            int expertUserId,
            string description,
            string? fileUrl,
            string? demoUrl,
            string? testResultUrl
        );

        Task<bool> ApproveDeliverableAsync(
            int deliverableId,
            int clientUserId
        );

        Task<bool> RequestRevisionAsync(
            int deliverableId,
            int clientUserId,
            string feedback
        );
    }
}