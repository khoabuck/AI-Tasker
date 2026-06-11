using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class ExpertSkillService : IExpertSkillService
{
    private static readonly string[] ValidSkillLevels =
    {
        "BEGINNER",
        "INTERMEDIATE",
        "ADVANCED",
        "EXPERT"
    };

    private readonly AITaskerDbContext _context;
    private readonly IExpertSkillAiProvider _expertSkillAiProvider;

    public ExpertSkillService(
        AITaskerDbContext context,
        IExpertSkillAiProvider expertSkillAiProvider)
    {
        _context = context;
        _expertSkillAiProvider = expertSkillAiProvider;
    }

    public async Task<List<ExpertSkillResponse>> GetMySkillsAsync(int userId)
    {
        var expertProfile = await _context.ExpertProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        return await GetExpertSkillsInternalAsync(expertProfile.ExpertProfileId);
    }

    public async Task<List<ExpertSkillResponse>> UpdateMySkillsAsync(
        int userId,
        UpdateExpertSkillsRequest request)
    {
        var expertProfile = await _context.ExpertProfiles
            .FirstOrDefaultAsync(x => x.UserId == userId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        ValidateRequest(request);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var oldSkills = await _context.ExpertSkills
            .Where(x => x.ExpertProfileId == expertProfile.ExpertProfileId)
            .ToListAsync();

        _context.ExpertSkills.RemoveRange(oldSkills);

        var distinctSkillIds = request.Skills
            .Select(x => x.SkillId)
            .Distinct()
            .ToList();

        var activeSkillIds = await _context.Skills
            .Where(x => distinctSkillIds.Contains(x.SkillId) && x.IsActive)
            .Select(x => x.SkillId)
            .ToListAsync();

        if (activeSkillIds.Count != distinctSkillIds.Count)
        {
            throw new InvalidOperationException("One or more skills are invalid or inactive.");
        }

        var newExpertSkills = request.Skills.Select(x => new ExpertSkill
        {
            ExpertProfileId = expertProfile.ExpertProfileId,
            SkillId = x.SkillId,
            SkillLevel = NormalizeSkillLevel(x.SkillLevel),
            YearsOfExperience = x.YearsOfExperience,
            IsPrimary = x.IsPrimary,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _context.ExpertSkills.AddRange(newExpertSkills);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return await GetExpertSkillsInternalAsync(expertProfile.ExpertProfileId);
    }

    public async Task<List<ExpertSkillResponse>> GetExpertSkillsAsync(int expertProfileId)
    {
        var expertExists = await _context.ExpertProfiles
            .AsNoTracking()
            .AnyAsync(x => x.ExpertProfileId == expertProfileId);

        if (!expertExists)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        return await GetExpertSkillsInternalAsync(expertProfileId);
    }

    public async Task<List<ExpertSkillResponse>> SyncFromProfileSkillsAsync(
        int expertProfileId,
        string? skillsText,
        int defaultYearsOfExperience)
    {
        var expertProfile = await _context.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.Certificates)
            .FirstOrDefaultAsync(x => x.ExpertProfileId == expertProfileId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        if (string.IsNullOrWhiteSpace(expertProfile.Skills))
        {
            return await GetExpertSkillsInternalAsync(expertProfileId);
        }

        var activeSkills = await _context.Skills
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SkillName)
            .ToListAsync();

        if (activeSkills.Count == 0)
        {
            return await GetExpertSkillsInternalAsync(expertProfileId);
        }

        try
        {
            var aiInput = new ExpertSkillAiProfileInput
            {
                ProfessionalTitle = expertProfile.ProfessionalTitle,
                Bio = expertProfile.Bio,
                SkillsText = expertProfile.Skills,
                YearsOfExperience = expertProfile.YearsOfExperience,
                PortfolioUrl = expertProfile.PortfolioUrl,
                LinkedInUrl = expertProfile.LinkedInUrl,
                GitHubUrl = expertProfile.GitHubUrl,
                Certificates = expertProfile.Certificates.Select(x => new ExpertSkillAiCertificateInput
                {
                    CertificateName = x.CertificateName,
                    CertificateIssuer = x.CertificateIssuer,
                    CertificateUrl = x.CertificateUrl,
                    IssuedAt = x.IssuedAt
                }).ToList()
            };

            var aiResult = await _expertSkillAiProvider.AnalyzeAsync(
                aiInput,
                activeSkills.Select(x => x.SkillName).ToList()
            );

            var expertSkillsFromAi = BuildExpertSkillsFromAiResult(
                expertProfileId,
                expertProfile.YearsOfExperience,
                aiResult,
                activeSkills
            );

            if (expertSkillsFromAi.Count > 0)
            {
                await ReplaceExpertSkillsAsync(expertProfileId, expertSkillsFromAi);
                return await GetExpertSkillsInternalAsync(expertProfileId);
            }
        }
        catch
        {
            // Nếu AI lỗi thì fallback qua rule thường để không làm hỏng luồng tạo profile.
        }

        var fallbackExpertSkills = BuildExpertSkillsFromText(
            expertProfileId,
            expertProfile.Skills,
            expertProfile.YearsOfExperience,
            activeSkills
        );

        if (fallbackExpertSkills.Count > 0)
        {
            await ReplaceExpertSkillsAsync(expertProfileId, fallbackExpertSkills);
        }

        return await GetExpertSkillsInternalAsync(expertProfileId);
    }

    private static List<ExpertSkill> BuildExpertSkillsFromAiResult(
        int expertProfileId,
        int totalYearsOfExperience,
        ExpertSkillAiAnalysisResult aiResult,
        List<Skill> activeSkills)
    {
        if (aiResult.Skills == null || aiResult.Skills.Count == 0)
        {
            return new List<ExpertSkill>();
        }

        var results = new List<ExpertSkill>();
        var usedSkillIds = new HashSet<int>();
        var safeTotalYears = Math.Clamp(totalYearsOfExperience, 0, 50);

        foreach (var aiSkill in aiResult.Skills)
        {
            if (string.IsNullOrWhiteSpace(aiSkill.SkillName))
            {
                continue;
            }

            var matchedSkill = activeSkills.FirstOrDefault(skill =>
                NormalizeSkillName(skill.SkillName) == NormalizeSkillName(aiSkill.SkillName));

            if (matchedSkill == null)
            {
                continue;
            }

            if (!usedSkillIds.Add(matchedSkill.SkillId))
            {
                continue;
            }

            var normalizedLevel = NormalizeSkillLevel(aiSkill.SkillLevel);

            if (!ValidSkillLevels.Contains(normalizedLevel))
            {
                normalizedLevel = InferSkillLevelFromYears(safeTotalYears);
            }

            var years = Math.Clamp(aiSkill.YearsOfExperience, 0, safeTotalYears);

            results.Add(new ExpertSkill
            {
                ExpertProfileId = expertProfileId,
                SkillId = matchedSkill.SkillId,
                SkillLevel = normalizedLevel,
                YearsOfExperience = years,
                IsPrimary = aiSkill.IsPrimary,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (results.Count > 0 && results.All(x => !x.IsPrimary))
        {
            foreach (var skill in results.Take(3))
            {
                skill.IsPrimary = true;
            }
        }

        return results;
    }

    private static List<ExpertSkill> BuildExpertSkillsFromText(
        int expertProfileId,
        string skillsText,
        int totalYearsOfExperience,
        List<Skill> activeSkills)
    {
        var requestedSkillNames = skillsText
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (requestedSkillNames.Count == 0)
        {
            return new List<ExpertSkill>();
        }

        var matchedSkills = activeSkills
            .Where(skill => requestedSkillNames.Any(input =>
                NormalizeSkillName(input) == NormalizeSkillName(skill.SkillName)))
            .GroupBy(x => x.SkillId)
            .Select(g => g.First())
            .ToList();

        var safeYears = Math.Clamp(totalYearsOfExperience, 0, 50);
        var level = InferSkillLevelFromYears(safeYears);

        return matchedSkills.Select((skill, index) => new ExpertSkill
        {
            ExpertProfileId = expertProfileId,
            SkillId = skill.SkillId,
            SkillLevel = level,
            YearsOfExperience = safeYears,
            IsPrimary = index < 3,
            CreatedAt = DateTime.UtcNow
        }).ToList();
    }

    private async Task ReplaceExpertSkillsAsync(
        int expertProfileId,
        List<ExpertSkill> newExpertSkills)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var oldExpertSkills = await _context.ExpertSkills
            .Where(x => x.ExpertProfileId == expertProfileId)
            .ToListAsync();

        _context.ExpertSkills.RemoveRange(oldExpertSkills);

        _context.ExpertSkills.AddRange(newExpertSkills);

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    private async Task<List<ExpertSkillResponse>> GetExpertSkillsInternalAsync(int expertProfileId)
    {
        var expertSkills = await _context.ExpertSkills
            .AsNoTracking()
            .Include(x => x.Skill)
            .Where(x => x.ExpertProfileId == expertProfileId)
            .OrderByDescending(x => x.IsPrimary)
            .ThenByDescending(x => x.YearsOfExperience)
            .ThenBy(x => x.Skill!.SkillName)
            .ToListAsync();

        return expertSkills.Select(ToResponse).ToList();
    }

    private static ExpertSkillResponse ToResponse(ExpertSkill expertSkill)
    {
        return new ExpertSkillResponse
        {
            ExpertSkillId = expertSkill.ExpertSkillId,
            ExpertProfileId = expertSkill.ExpertProfileId,
            SkillId = expertSkill.SkillId,
            SkillName = expertSkill.Skill?.SkillName ?? string.Empty,
            Category = expertSkill.Skill?.Category,
            SkillLevel = expertSkill.SkillLevel,
            YearsOfExperience = expertSkill.YearsOfExperience,
            IsPrimary = expertSkill.IsPrimary,
            CreatedAt = expertSkill.CreatedAt
        };
    }

    private static void ValidateRequest(UpdateExpertSkillsRequest request)
    {
        if (request.Skills == null || request.Skills.Count == 0)
        {
            throw new InvalidOperationException("At least one skill is required.");
        }

        if (request.Skills.Count > 30)
        {
            throw new InvalidOperationException("Expert can have at most 30 skills.");
        }

        var duplicatedSkillIds = request.Skills
            .GroupBy(x => x.SkillId)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicatedSkillIds.Count > 0)
        {
            throw new InvalidOperationException("Duplicate skills are not allowed.");
        }

        foreach (var skill in request.Skills)
        {
            if (skill.SkillId <= 0)
            {
                throw new InvalidOperationException("Invalid skill id.");
            }

            if (skill.YearsOfExperience < 0 || skill.YearsOfExperience > 50)
            {
                throw new InvalidOperationException("Years of experience must be between 0 and 50.");
            }

            var normalizedLevel = NormalizeSkillLevel(skill.SkillLevel);

            if (!ValidSkillLevels.Contains(normalizedLevel))
            {
                throw new InvalidOperationException(
                    "Skill level must be BEGINNER, INTERMEDIATE, ADVANCED, or EXPERT."
                );
            }
        }
    }

    private static string NormalizeSkillLevel(string? skillLevel)
    {
        if (string.IsNullOrWhiteSpace(skillLevel))
        {
            return "INTERMEDIATE";
        }

        return skillLevel.Trim().ToUpper();
    }

    private static string InferSkillLevelFromYears(int yearsOfExperience)
    {
        if (yearsOfExperience <= 1)
        {
            return "BEGINNER";
        }

        if (yearsOfExperience <= 3)
        {
            return "INTERMEDIATE";
        }

        if (yearsOfExperience <= 6)
        {
            return "ADVANCED";
        }

        return "EXPERT";
    }

    private static string NormalizeSkillName(string value)
    {
        return value
            .Trim()
            .ToLower()
            .Replace(" ", "")
            .Replace(".", "")
            .Replace("-", "")
            .Replace("_", "");
    }
}