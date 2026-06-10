using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class SkillService : ISkillService
{
    private readonly AITaskerDbContext _context;

    public SkillService(AITaskerDbContext context)
    {
        _context = context;
    }

    public async Task<List<SkillResponse>> GetSkillsAsync(
        string? keyword,
        string? category,
        bool activeOnly)
    {
        var query = _context.Skills
            .AsNoTracking()
            .AsQueryable();

        if (activeOnly)
        {
            query = query.Where(x => x.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var trimmedKeyword = keyword.Trim();

            query = query.Where(x =>
                x.SkillName.Contains(trimmedKeyword));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var trimmedCategory = category.Trim();

            query = query.Where(x =>
                x.Category != null &&
                x.Category.Contains(trimmedCategory));
        }

        return await query
            .OrderBy(x => x.Category)
            .ThenBy(x => x.SkillName)
            .Select(x => new SkillResponse
            {
                SkillId = x.SkillId,
                SkillName = x.SkillName,
                Description = x.Description,
                Category = x.Category,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<SkillResponse?> GetSkillByIdAsync(int id)
    {
        var skill = await _context.Skills
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.SkillId == id);

        if (skill == null)
        {
            return null;
        }

        return new SkillResponse
        {
            SkillId = skill.SkillId,
            SkillName = skill.SkillName,
            Description = skill.Description,
            Category = skill.Category,
            IsActive = skill.IsActive,
            CreatedAt = skill.CreatedAt
        };
    }

    public async Task<SkillResponse> CreateSkillAsync(CreateSkillRequest request)
    {
        var skillName = request.SkillName.Trim();

        if (string.IsNullOrWhiteSpace(skillName))
        {
            throw new InvalidOperationException("Skill name is required.");
        }

        var isDuplicate = await _context.Skills
            .AnyAsync(x => x.SkillName == skillName);

        if (isDuplicate)
        {
            throw new InvalidOperationException("Skill name already exists.");
        }

        var skill = new Skill
        {
            SkillName = skillName,
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category)
                ? null
                : request.Category.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Skills.Add(skill);
        await _context.SaveChangesAsync();

        return new SkillResponse
        {
            SkillId = skill.SkillId,
            SkillName = skill.SkillName,
            Description = skill.Description,
            Category = skill.Category,
            IsActive = skill.IsActive,
            CreatedAt = skill.CreatedAt
        };
    }

    public async Task<SkillResponse?> UpdateSkillAsync(
        int id,
        UpdateSkillRequest request)
    {
        var skill = await _context.Skills
            .FirstOrDefaultAsync(x => x.SkillId == id);

        if (skill == null)
        {
            return null;
        }

        var skillName = request.SkillName.Trim();

        if (string.IsNullOrWhiteSpace(skillName))
        {
            throw new InvalidOperationException("Skill name is required.");
        }

        var isDuplicate = await _context.Skills
            .AnyAsync(x => x.SkillId != id && x.SkillName == skillName);

        if (isDuplicate)
        {
            throw new InvalidOperationException("Skill name already exists.");
        }

        skill.SkillName = skillName;
        skill.Description = string.IsNullOrWhiteSpace(request.Description)
            ? null
            : request.Description.Trim();
        skill.Category = string.IsNullOrWhiteSpace(request.Category)
            ? null
            : request.Category.Trim();
        skill.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return new SkillResponse
        {
            SkillId = skill.SkillId,
            SkillName = skill.SkillName,
            Description = skill.Description,
            Category = skill.Category,
            IsActive = skill.IsActive,
            CreatedAt = skill.CreatedAt
        };
    }

    public async Task<bool> DeactivateSkillAsync(int id)
    {
        var skill = await _context.Skills
            .FirstOrDefaultAsync(x => x.SkillId == id);

        if (skill == null)
        {
            return false;
        }

        skill.IsActive = false;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ActivateSkillAsync(int id)
    {
        var skill = await _context.Skills
            .FirstOrDefaultAsync(x => x.SkillId == id);

        if (skill == null)
        {
            return false;
        }

        skill.IsActive = true;
        await _context.SaveChangesAsync();

        return true;
    }
}