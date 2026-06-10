using System.Threading.Tasks;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces
{
    public interface IDeliverableService
    {
        Task<Deliverable?> SubmitDeliverableAsync(int milestoneId, int expertId, string description, string? fileUrl, string? demoUrl, string? testResultUrl);
        Task<bool> ApproveDeliverableAsync(int deliverableId);
        Task<bool> RequestRevisionAsync(int deliverableId, string feedback);
    }
}