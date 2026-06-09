using AITasker.Application.DTOs.Requests;
using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IJobRepository
{
    Task<ClientProfile?> GetClientProfileByUserIdAsync(int userId);

    Task AddAsync(JobPosting job);

    Task<JobPosting?> GetByIdWithSkillsAsync(int jobId);

    Task<List<JobPosting>> BrowseAsync(JobFilterRequest filter);

    Task<int> CountAsync(JobFilterRequest filter);

    Task<List<JobPosting>> GetByClientProfileIdAsync(int clientProfileId);

    void RemoveJobSkills(IEnumerable<JobSkill> jobSkills);

    Task SaveChangesAsync();
}
