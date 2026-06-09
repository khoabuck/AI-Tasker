using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class SkillService : ISkillService
{
    private readonly ISkillRepository _skillRepository;

    public SkillService(ISkillRepository skillRepository)
    {
        _skillRepository = skillRepository;
    }

    public async Task<List<SkillResponse>> GetActiveAsync(string? category, string? search)
    {
        var skills = await _skillRepository.GetActiveAsync(
            string.IsNullOrWhiteSpace(category) ? null : category.Trim(),
            string.IsNullOrWhiteSpace(search) ? null : search.Trim()
        );

        return skills.Select(ToResponse).ToList();
    }

    public async Task<SkillResponse> CreateAsync(CreateSkillRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SkillName))
        {
            throw new InvalidOperationException("Skill name is required.");
        }

        var name = request.SkillName.Trim();
        if (await _skillRepository.ExistsByNameAsync(name))
        {
            throw new InvalidOperationException("Skill name already exists.");
        }

        var skill = new Skill
        {
            SkillName = name,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _skillRepository.AddAsync(skill);
        await _skillRepository.SaveChangesAsync();
        return ToResponse(skill);
    }

    public async Task<SkillResponse> UpdateAsync(int skillId, UpdateSkillRequest request)
    {
        var skill = await _skillRepository.GetByIdAsync(skillId)
            ?? throw new InvalidOperationException("Skill not found.");

        if (string.IsNullOrWhiteSpace(request.SkillName))
        {
            throw new InvalidOperationException("Skill name is required.");
        }

        var newName = request.SkillName.Trim();
        if (!string.Equals(newName, skill.SkillName, StringComparison.OrdinalIgnoreCase)
            && await _skillRepository.ExistsByNameAsync(newName))
        {
            throw new InvalidOperationException("Skill name already exists.");
        }

        skill.SkillName = newName;
        skill.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        skill.Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim();
        skill.IsActive = request.IsActive;

        await _skillRepository.SaveChangesAsync();
        return ToResponse(skill);
    }

    private static SkillResponse ToResponse(Skill skill)
    {
        return new SkillResponse
        {
            SkillId = skill.SkillId,
            SkillName = skill.SkillName,
            Description = skill.Description,
            Category = skill.Category,
            IsActive = skill.IsActive
        };
    }
}
