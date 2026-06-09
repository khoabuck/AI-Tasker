using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IExpertSkillRepository
{
    Task<ExpertProfile?> GetExpertProfileByUserIdAsync(int userId);

    Task<List<ExpertSkill>> GetByExpertProfileIdAsync(int expertProfileId);

    void RemoveRange(IEnumerable<ExpertSkill> expertSkills);

    Task AddRangeAsync(IEnumerable<ExpertSkill> expertSkills);

    Task SaveChangesAsync();
}
