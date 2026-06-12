using System.Collections.Generic;
using System.Threading.Tasks;
using AITasker.Application.DTOs.Requests;

namespace AITasker.Application.Interfaces
{
    public interface IProjectService
    {
        Task<bool> InitializeProjectWithMilestonesAsync(
            int currentUserId,
            int contractId,
            List<CreateMilestoneRequest> milestones
        );
    }
}