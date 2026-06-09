using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface ISkillRepository
{
    Task<List<Skill>> GetActiveAsync(string? category, string? search);

    Task<List<Skill>> GetByIdsAsync(IEnumerable<int> skillIds);

    Task<bool> ExistsByNameAsync(string skillName);

    Task<Skill?> GetByIdAsync(int skillId);

    Task AddAsync(Skill skill);

    Task SaveChangesAsync();
}
