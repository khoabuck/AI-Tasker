using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class SkillRepository : ISkillRepository
{
    private readonly AITaskerDbContext _context;

    public SkillRepository(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<List<Skill>> GetActiveAsync(string? category, string? search)
    {
        var query = _context.Skills.Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(x => x.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(x => x.SkillName.Contains(search));
        }

        return await query.OrderBy(x => x.SkillName).ToListAsync();
    }

    public async Task<List<Skill>> GetByIdsAsync(IEnumerable<int> skillIds)
    {
        var ids = skillIds.Distinct().ToList();
        return await _context.Skills.Where(x => ids.Contains(x.SkillId)).ToListAsync();
    }

    public async Task<bool> ExistsByNameAsync(string skillName)
    {
        return await _context.Skills.AnyAsync(x => x.SkillName.ToLower() == skillName.ToLower());
    }

    public async Task<Skill?> GetByIdAsync(int skillId)
    {
        return await _context.Skills.FirstOrDefaultAsync(x => x.SkillId == skillId);
    }

    public async Task AddAsync(Skill skill)
    {
        await _context.Skills.AddAsync(skill);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
