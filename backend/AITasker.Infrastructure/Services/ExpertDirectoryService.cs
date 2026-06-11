using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Services;

public class ExpertDirectoryService : IExpertDirectoryService
{
    private const string ActiveUserStatus = "ACTIVE";
    private const string ApprovedProfileStatus = "APPROVED";

    private readonly AITaskerDbContext _context;

    public ExpertDirectoryService(AITaskerDbContext context)
    {
        _context = context;
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
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ExpertSkills)
                .ThenInclude(x => x.Skill)
            .Where(x =>
                x.User.Status == ActiveUserStatus &&
                x.ProfileReviewStatus == ApprovedProfileStatus
            );

        if (availableOnly)
        {
            query = query.Where(x => x.AvailableForWork);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var search = keyword.Trim();

            query = query.Where(x =>
                EF.Functions.Like(x.User.FullName, $"%{search}%") ||
                EF.Functions.Like(x.ProfessionalTitle, $"%{search}%") ||
                EF.Functions.Like(x.Bio, $"%{search}%") ||
                EF.Functions.Like(x.Skills, $"%{search}%") ||
                x.ExpertSkills.Any(es =>
                    es.Skill != null &&
                    EF.Functions.Like(es.Skill.SkillName, $"%{search}%")
                )
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
            var normalizedLevel = level.Trim().ToUpper();

            query = query.Where(x => x.Level == normalizedLevel);
        }

        var totalItems = await query.CountAsync();

        var experts = await query
            .OrderByDescending(x => x.ProfileScore)
            .ThenByDescending(x => x.YearsOfExperience)
            .ThenBy(x => x.User.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var totalPages = totalItems == 0
            ? 0
            : (int)Math.Ceiling(totalItems / (double)pageSize);

        return new ExpertDirectoryPagedResponse
        {
            Page = page,
            PageSize = pageSize,
            TotalItems = totalItems,
            TotalPages = totalPages,
            Items = experts.Select(x => ToResponse(x, includeCertificates: false)).ToList()
        };
    }

    public async Task<ExpertDirectoryItemResponse?> GetExpertByIdAsync(int expertProfileId)
    {
        var expert = await _context.ExpertProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ExpertSkills)
                .ThenInclude(x => x.Skill)
            .Include(x => x.Certificates)
            .FirstOrDefaultAsync(x =>
                x.ExpertProfileId == expertProfileId &&
                x.User.Status == ActiveUserStatus &&
                x.ProfileReviewStatus == ApprovedProfileStatus
            );

        if (expert == null)
        {
            return null;
        }

        return ToResponse(expert, includeCertificates: true);
    }

    private static ExpertDirectoryItemResponse ToResponse(
        ExpertProfile expert,
        bool includeCertificates
    )
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
            SkillsText = expert.Skills,
            YearsOfExperience = expert.YearsOfExperience,
            ExpectedProjectBudgetMin = expert.ExpectedProjectBudgetMin,
            ExpectedProjectBudgetMax = expert.ExpectedProjectBudgetMax,
            PreferredProjectDurationDays = expert.PreferredProjectDurationDays,
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
            ExpertSkills = expert.ExpertSkills
                .Where(x => x.Skill != null)
                .OrderByDescending(x => x.IsPrimary)
                .ThenByDescending(x => x.YearsOfExperience)
                .ThenBy(x => x.Skill!.SkillName)
                .Select(x => new ExpertDirectorySkillResponse
                {
                    SkillId = x.SkillId,
                    SkillName = x.Skill?.SkillName ?? string.Empty,
                    Category = x.Skill?.Category,
                    SkillLevel = x.SkillLevel,
                    YearsOfExperience = x.YearsOfExperience,
                    IsPrimary = x.IsPrimary
                })
                .ToList(),
            Certificates = includeCertificates
                ? expert.Certificates
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new ExpertDirectoryCertificateResponse
                    {
                        ExpertCertificateId = x.ExpertCertificateId,
                        CertificateName = x.CertificateName,
                        CertificateIssuer = x.CertificateIssuer,
                        CertificateUrl = x.CertificateUrl,
                        IssuedAt = x.IssuedAt,
                        CreatedAt = x.CreatedAt
                    })
                    .ToList()
                : new List<ExpertDirectoryCertificateResponse>()
        };
    }
}