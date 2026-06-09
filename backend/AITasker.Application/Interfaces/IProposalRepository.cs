using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IProposalRepository
{
    Task<ExpertProfile?> GetExpertProfileByUserIdAsync(int userId);

    Task<ClientProfile?> GetClientProfileByUserIdAsync(int userId);

    Task<JobPosting?> GetJobByIdAsync(int jobId);

    Task<bool> ExistsByJobAndExpertAsync(int jobId, int expertProfileId);

    Task AddAsync(Proposal proposal);

    Task<Proposal?> GetByIdAsync(int proposalId);

    Task<List<Proposal>> GetByJobIdAsync(int jobId);

    Task<List<Proposal>> GetByExpertProfileIdAsync(int expertProfileId);

    Task SaveChangesAsync();
}
