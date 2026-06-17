using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class ExpertDirectoryService : IExpertDirectoryService
{
    private const string UserStatusActive = "ACTIVE";
    private const string ExpertReviewApproved = "APPROVED";

    private readonly AITaskerDbContext _dbContext;

    public ExpertDirectoryService(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ExpertDirectoryPagedResponse> GetExpertsAsync(
        string? keyword,
        int? skillId,
        string? level,
        bool availableOnly,
        int page,
        int pageSize
    )
    {
        var safePage = page <= 0 ? 1 : page;
        var safePageSize = Math.Clamp(pageSize, 1, 50);

        var query = _dbContext.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ExpertSkills)
                .ThenInclude(x => x.Skill)
            .Include(x => x.Certificates)
            .Where(x =>
                x.User.Status == UserStatusActive &&
                x.ProfileReviewStatus == ExpertReviewApproved
            );

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var normalizedKeyword = keyword.Trim().ToLower();

            query = query.Where(x =>
                x.User.FullName.ToLower().Contains(normalizedKeyword) ||
                x.ProfessionalTitle.ToLower().Contains(normalizedKeyword) ||
                x.Bio.ToLower().Contains(normalizedKeyword) ||
                x.Skills.ToLower().Contains(normalizedKeyword) ||
                x.ExpertCategory.ToLower().Contains(normalizedKeyword)
            );
        }

        if (skillId.HasValue && skillId.Value > 0)
        {
            query = query.Where(x =>
                x.ExpertSkills.Any(es => es.SkillId == skillId.Value)
            );
        }

        if (!string.IsNullOrWhiteSpace(level))
        {
            var normalizedLevel = NormalizeProfileLevel(level);

            query = query.Where(x => x.Level == normalizedLevel);
        }

        if (availableOnly)
        {
            query = query.Where(x => x.AvailableForWork);
        }

        var totalItems = await query.CountAsync();

        var experts = await query
            .OrderByDescending(x => x.ProfileScore)
            .ThenByDescending(x => x.VerifiedYearsOfExperience)
            .ThenByDescending(x => x.ExperienceConfidenceScore)
            .ThenBy(x => x.User.FullName)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToListAsync();

        return new ExpertDirectoryPagedResponse
        {
            Page = safePage,
            PageSize = safePageSize,
            TotalItems = totalItems,
            TotalPages = (int)Math.Ceiling(totalItems / (double)safePageSize),
            Items = experts.Select(ToResponse).ToList()
        };
    }

    public async Task<ExpertDirectoryItemResponse?> GetExpertByIdAsync(
        int expertProfileId
    )
    {
        var expert = await _dbContext.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ExpertSkills)
                .ThenInclude(x => x.Skill)
            .Include(x => x.Certificates)
            .FirstOrDefaultAsync(x =>
                x.ExpertProfileId == expertProfileId &&
                x.User.Status == UserStatusActive &&
                x.ProfileReviewStatus == ExpertReviewApproved
            );

        if (expert == null)
        {
            return null;
        }

        return ToResponse(expert);
    }

    private static ExpertDirectoryItemResponse ToResponse(ExpertProfile expert)
    {
        return new ExpertDirectoryItemResponse
        {
            ExpertProfileId = expert.ExpertProfileId,
            UserId = expert.UserId,
            FullName = expert.User.FullName,
            Email = expert.User.Email,
            AvatarUrl = expert.User.AvatarUrl,

            ProfessionalTitle = expert.ProfessionalTitle,
            Bio = expert.Bio,
            Skills = expert.Skills,

            // Expert tự khai
            YearsOfExperience = expert.YearsOfExperience,

            // Backend/AI xác minh
            VerifiedYearsOfExperience = expert.VerifiedYearsOfExperience,
            ExperienceConfidenceScore = expert.ExperienceConfidenceScore,
            ExperienceVerificationStatus = expert.ExperienceVerificationStatus,
            ExperienceVerificationNote = expert.ExperienceVerificationNote,

            AvailableForWork = expert.AvailableForWork,

            PortfolioUrl = expert.PortfolioUrl,
            LinkedInUrl = expert.LinkedInUrl,
            GitHubUrl = expert.GitHubUrl,

            ExpertCategory = expert.ExpertCategory,
            ProfileScore = expert.ProfileScore,
            Level = expert.Level,
            ProfileReviewStatus = expert.ProfileReviewStatus,
            VerifiedAt = expert.VerifiedAt,

            CreatedAt = expert.CreatedAt,
            UpdatedAt = expert.UpdatedAt,

            ExpertSkills = expert.ExpertSkills
                .OrderByDescending(x => x.IsPrimary)
                .ThenByDescending(x => x.YearsOfExperience)
                .ThenBy(x => x.Skill != null ? x.Skill.SkillName : string.Empty)
                .Select(ToSkillResponse)
                .ToList(),

            Certificates = expert.Certificates
                .OrderByDescending(x => x.VerificationScore)
                .ThenByDescending(x => x.CheckedAt)
                .Select(ToCertificateResponse)
                .ToList()
        };
    }

    private static ExpertDirectorySkillResponse ToSkillResponse(
        ExpertSkill expertSkill
    )
    {
        return new ExpertDirectorySkillResponse
        {
            SkillId = expertSkill.SkillId,
            SkillName = expertSkill.Skill?.SkillName ?? string.Empty,
            Category = expertSkill.Skill?.Category,
            SkillLevel = expertSkill.SkillLevel,
            YearsOfExperience = expertSkill.YearsOfExperience,
            IsPrimary = expertSkill.IsPrimary
        };
    }

    private static ExpertDirectoryCertificateResponse ToCertificateResponse(
        ExpertCertificate certificate
    )
    {
        return new ExpertDirectoryCertificateResponse
        {
            ExpertCertificateId = certificate.ExpertCertificateId,
            CertificateName = certificate.CertificateName,
            CertificateIssuer = certificate.CertificateIssuer,
            CertificateUrl = certificate.CertificateUrl,
            IssuedAt = certificate.IssuedAt,
            CreatedAt = certificate.CreatedAt,

            VerificationStatus = certificate.VerificationStatus,
            VerificationScore = certificate.VerificationScore,
            VerificationNote = certificate.VerificationNote,
            DetectedIssuer = certificate.DetectedIssuer,
            DetectedCertificateName = certificate.DetectedCertificateName,
            CheckedAt = certificate.CheckedAt
        };
    }

    private static string NormalizeProfileLevel(string? level)
    {
        if (string.IsNullOrWhiteSpace(level))
        {
            return string.Empty;
        }

        var normalized = level.Trim()
            .ToUpperInvariant()
            .Replace("-", "_")
            .Replace(" ", "_");

        return normalized switch
        {
            "FRESHER" => "FRESHER",
            "JUNIOR" => "JUNIOR",
            "MID" => "MID_LEVEL",
            "MIDLEVEL" => "MID_LEVEL",
            "MID_LEVEL" => "MID_LEVEL",
            "SENIOR" => "SENIOR",
            "LEAD" => "LEAD",
            _ => normalized
        };
    }
}