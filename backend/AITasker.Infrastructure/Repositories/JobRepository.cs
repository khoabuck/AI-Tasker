using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class JobRepository : IJobRepository
{
    private readonly AITaskerDbContext _context;

    public JobRepository(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<ClientProfile?> GetClientProfileByUserIdAsync(int userId)
    {
        return await _context.ClientProfiles
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task AddAsync(JobPosting job)
    {
        await _context.JobPostings.AddAsync(job);
    }

    public async Task<JobPosting?> GetByIdWithSkillsAsync(int jobId)
    {
        return await _context.JobPostings
            .Include(x => x.JobSkills)
                .ThenInclude(s => s.Skill)
            .FirstOrDefaultAsync(x => x.JobId == jobId);
    }

    public async Task<List<JobPosting>> BrowseAsync(JobFilterRequest filter)
    {
        var query = _context.JobPostings
            .Include(x => x.JobSkills)
                .ThenInclude(s => s.Skill)
            .AsQueryable();

        var status = string.IsNullOrWhiteSpace(filter.Status) ? "OPEN" : filter.Status.Trim().ToUpperInvariant();
        query = query.Where(x => x.Status == status);

        if (filter.SkillId is int skillId)
        {
            query = query.Where(x => x.JobSkills.Any(s => s.SkillId == skillId));
        }
        if (filter.BudgetMin is decimal bmin)
        {
            query = query.Where(x => x.BudgetMax >= bmin);
        }
        if (filter.BudgetMax is decimal bmax)
        {
            query = query.Where(x => x.BudgetMin <= bmax);
        }
        if (!string.IsNullOrWhiteSpace(filter.Complexity))
        {
            var c = filter.Complexity.Trim().ToUpperInvariant();
            query = query.Where(x => x.Complexity == c);
        }
        if (!string.IsNullOrWhiteSpace(filter.ProjectType))
        {
            query = query.Where(x => x.ProjectType == filter.ProjectType);
        }

        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize is < 1 or > 100 ? 20 : filter.PageSize;

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> CountAsync(JobFilterRequest filter)
    {
        var query = _context.JobPostings.AsQueryable();

        var status = string.IsNullOrWhiteSpace(filter.Status) ? "OPEN" : filter.Status.Trim().ToUpperInvariant();
        query = query.Where(x => x.Status == status);

        if (filter.SkillId is int skillId)
        {
            query = query.Where(x => x.JobSkills.Any(s => s.SkillId == skillId));
        }
        if (filter.BudgetMin is decimal bmin)
        {
            query = query.Where(x => x.BudgetMax >= bmin);
        }
        if (filter.BudgetMax is decimal bmax)
        {
            query = query.Where(x => x.BudgetMin <= bmax);
        }
        if (!string.IsNullOrWhiteSpace(filter.Complexity))
        {
            var c = filter.Complexity.Trim().ToUpperInvariant();
            query = query.Where(x => x.Complexity == c);
        }
        if (!string.IsNullOrWhiteSpace(filter.ProjectType))
        {
            query = query.Where(x => x.ProjectType == filter.ProjectType);
        }

        return await query.CountAsync();
    }

    public async Task<List<JobPosting>> GetByClientProfileIdAsync(int clientProfileId)
    {
        return await _context.JobPostings
            .Include(x => x.JobSkills)
                .ThenInclude(s => s.Skill)
            .Where(x => x.ClientProfileId == clientProfileId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public void RemoveJobSkills(IEnumerable<JobSkill> jobSkills)
    {
        _context.JobSkills.RemoveRange(jobSkills);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
