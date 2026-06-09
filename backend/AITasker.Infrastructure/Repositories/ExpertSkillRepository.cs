using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class ExpertSkillRepository : IExpertSkillRepository
{
    private readonly AITaskerDbContext _context;

    public ExpertSkillRepository(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<ExpertProfile?> GetExpertProfileByUserIdAsync(int userId)
    {
        return await _context.ExpertProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task<List<ExpertSkill>> GetByExpertProfileIdAsync(int expertProfileId)
    {
        return await _context.ExpertSkills
            .Include(x => x.Skill)
            .Where(x => x.ExpertProfileId == expertProfileId)
            .ToListAsync();
    }

    public void RemoveRange(IEnumerable<ExpertSkill> expertSkills)
    {
        _context.ExpertSkills.RemoveRange(expertSkills);
    }

    public async Task AddRangeAsync(IEnumerable<ExpertSkill> expertSkills)
    {
        await _context.ExpertSkills.AddRangeAsync(expertSkills);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
