using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class ExpertSkillService : IExpertSkillService
{
    private static readonly string[] ValidLevels = { "BEGINNER", "INTERMEDIATE", "ADVANCED" };

    private readonly IExpertSkillRepository _expertSkillRepository;
    private readonly ISkillRepository _skillRepository;

    public ExpertSkillService(
        IExpertSkillRepository expertSkillRepository,
        ISkillRepository skillRepository)
    {
        _expertSkillRepository = expertSkillRepository;
        _skillRepository = skillRepository;
    }

    public async Task<List<ExpertSkillResponse>> GetMySkillsAsync(int userId)
    {
        var expertProfile = await _expertSkillRepository.GetExpertProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Expert profile not found.");

        var skills = await _expertSkillRepository.GetByExpertProfileIdAsync(expertProfile.ExpertProfileId);
        return skills.Select(ToResponse).ToList();
    }

    public async Task<List<ExpertSkillResponse>> SetMySkillsAsync(int userId, SetExpertSkillsRequest request)
    {
        var expertProfile = await _expertSkillRepository.GetExpertProfileByUserIdAsync(userId)
            ?? throw new InvalidOperationException("Expert profile not found.");

        var items = request.Skills ?? new List<SetExpertSkillItem>();

        foreach (var item in items)
        {
            item.SkillLevel = (item.SkillLevel ?? string.Empty).Trim().ToUpperInvariant();
            if (!ValidLevels.Contains(item.SkillLevel))
            {
                throw new InvalidOperationException(
                    $"Invalid skill level '{item.SkillLevel}'. Allowed: BEGINNER, INTERMEDIATE, ADVANCED.");
            }

            if (item.YearsOfExperience is < 0)
            {
                throw new InvalidOperationException("Years of experience must be >= 0.");
            }
        }

        var skillIds = items.Select(x => x.SkillId).ToList();
        if (skillIds.Count != skillIds.Distinct().Count())
        {
            throw new InvalidOperationException("Duplicate skillId in request.");
        }

        var foundSkills = await _skillRepository.GetByIdsAsync(skillIds);
        var foundActiveIds = foundSkills.Where(x => x.IsActive).Select(x => x.SkillId).ToHashSet();

        foreach (var id in skillIds)
        {
            if (!foundActiveIds.Contains(id))
            {
                throw new InvalidOperationException($"Skill {id} does not exist or is not active.");
            }
        }

        var existing = await _expertSkillRepository.GetByExpertProfileIdAsync(expertProfile.ExpertProfileId);
        _expertSkillRepository.RemoveRange(existing);

        var newSkills = items.Select(x => new ExpertSkill
        {
            ExpertProfileId = expertProfile.ExpertProfileId,
            SkillId = x.SkillId,
            SkillLevel = x.SkillLevel,
            YearsOfExperience = x.YearsOfExperience
        }).ToList();

        await _expertSkillRepository.AddRangeAsync(newSkills);
        await _expertSkillRepository.SaveChangesAsync();

        var skillNameById = foundSkills.ToDictionary(x => x.SkillId, x => x.SkillName);
        return newSkills.Select(x => ToResponse(x, skillNameById.GetValueOrDefault(x.SkillId, ""))).ToList();
    }

    private static ExpertSkillResponse ToResponse(ExpertSkill expertSkill)
    {
        return ToResponse(expertSkill, expertSkill.Skill?.SkillName ?? string.Empty);
    }

    private static ExpertSkillResponse ToResponse(ExpertSkill expertSkill, string skillName)
    {
        return new ExpertSkillResponse
        {
            ExpertSkillId = expertSkill.ExpertSkillId,
            SkillId = expertSkill.SkillId,
            SkillName = skillName,
            SkillLevel = expertSkill.SkillLevel,
            YearsOfExperience = expertSkill.YearsOfExperience
        };
    }
}
