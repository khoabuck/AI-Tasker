using System.Threading.Tasks;
using System.Collections.Generic;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Application.Interfaces
{
    public interface IProjectService
    {
        Task<bool> InitializeProjectWithMilestonesAsync(int contractId, List<CreateMilestoneRequest> milestones);
    }
}