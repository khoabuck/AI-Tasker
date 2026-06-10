using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class ExpertProfileService : IExpertProfileService
{
    private readonly IExpertProfileRepository _expertProfileRepository;
    private readonly IExpertProfileReviewProvider _expertProfileReviewProvider;
    private readonly IUrlInspectionService _urlInspectionService;

    public ExpertProfileService(
        IExpertProfileRepository expertProfileRepository,
        IExpertProfileReviewProvider expertProfileReviewProvider,
        IUrlInspectionService urlInspectionService
    )
    {
        _expertProfileRepository = expertProfileRepository;
        _expertProfileReviewProvider = expertProfileReviewProvider;
        _urlInspectionService = urlInspectionService;
    }

    public async Task<ExpertProfileResponse> CreateAsync(
        int userId,
        CreateExpertProfileRequest request
    )
    {
        ValidateRequest(request);

        var user = await _expertProfileRepository.GetUserByIdAsync(userId);

        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        if (!string.Equals(user.Role, "EXPERT", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only EXPERT users can create an expert profile.");
        }

        if (!string.Equals(user.Status, "PENDING_PROFILE", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "User must be in PENDING_PROFILE status to create expert profile."
            );
        }

        var existed = await _expertProfileRepository.ExistsByUserIdAsync(userId);

        if (existed)
        {
            throw new InvalidOperationException("Expert profile already exists.");
        }

        if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
        {
            user.AvatarUrl = request.AvatarUrl.Trim();
        }

        var reviewResult = await ReviewByAiAsync(request);

        var expertProfile = new ExpertProfile
        {
            UserId = userId,
            ProfessionalTitle = request.ProfessionalTitle.Trim(),
            Bio = request.Bio.Trim(),
            Skills = request.Skills.Trim(),
            YearsOfExperience = request.YearsOfExperience,
            ExpectedProjectBudgetMin = request.ExpectedProjectBudgetMin,
            ExpectedProjectBudgetMax = request.ExpectedProjectBudgetMax,
            PreferredProjectDurationDays = request.PreferredProjectDurationDays,
            AvailableForWork = request.AvailableForWork,
            PortfolioUrl = NormalizeNullable(request.PortfolioUrl),
            LinkedInUrl = NormalizeNullable(request.LinkedInUrl),
            GitHubUrl = NormalizeNullable(request.GitHubUrl),

            ExpertCategory = reviewResult.ExpertCategory,
            ProfileScore = reviewResult.ProfileScore,
            Level = reviewResult.Level,
            ProfileReviewStatus = reviewResult.Status,
            ProfileReviewNote = reviewResult.ReviewNote,
            MissingInformation = reviewResult.MissingInformation,
            VerifiedAt = reviewResult.Status == "APPROVED"
                ? DateTime.UtcNow
                : null,

            CreatedAt = DateTime.UtcNow,
            Certificates = BuildCertificates(request)
        };

        ApplyUserStatusByReview(user, reviewResult.Status);

        await _expertProfileRepository.AddAsync(expertProfile);
        await _expertProfileRepository.SaveChangesAsync();

        expertProfile.User = user;

        return ToResponse(expertProfile);
    }

    public async Task<ExpertProfileResponse> ResubmitAsync(
        int userId,
        CreateExpertProfileRequest request
    )
    {
        ValidateRequest(request);

        var expertProfile = await _expertProfileRepository.GetByUserIdAsync(userId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        var user = expertProfile.User;

        if (!string.Equals(user.Role, "EXPERT", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only EXPERT users can resubmit an expert profile.");
        }

        if (string.Equals(expertProfile.ProfileReviewStatus, "APPROVED", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Approved expert profile cannot be resubmitted. Use update profile API instead."
            );
        }

        if (!CanResubmit(user.Status, expertProfile.ProfileReviewStatus))
        {
            throw new InvalidOperationException(
                "Expert profile cannot be resubmitted in the current status."
            );
        }

        if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
        {
            user.AvatarUrl = request.AvatarUrl.Trim();
        }

        var reviewResult = await ReviewByAiAsync(request);

        expertProfile.ProfessionalTitle = request.ProfessionalTitle.Trim();
        expertProfile.Bio = request.Bio.Trim();
        expertProfile.Skills = request.Skills.Trim();
        expertProfile.YearsOfExperience = request.YearsOfExperience;
        expertProfile.ExpectedProjectBudgetMin = request.ExpectedProjectBudgetMin;
        expertProfile.ExpectedProjectBudgetMax = request.ExpectedProjectBudgetMax;
        expertProfile.PreferredProjectDurationDays = request.PreferredProjectDurationDays;
        expertProfile.AvailableForWork = request.AvailableForWork;
        expertProfile.PortfolioUrl = NormalizeNullable(request.PortfolioUrl);
        expertProfile.LinkedInUrl = NormalizeNullable(request.LinkedInUrl);
        expertProfile.GitHubUrl = NormalizeNullable(request.GitHubUrl);

        expertProfile.ExpertCategory = reviewResult.ExpertCategory;
        expertProfile.ProfileScore = reviewResult.ProfileScore;
        expertProfile.Level = reviewResult.Level;
        expertProfile.ProfileReviewStatus = reviewResult.Status;
        expertProfile.ProfileReviewNote = reviewResult.ReviewNote;
        expertProfile.MissingInformation = reviewResult.MissingInformation;
        expertProfile.VerifiedAt = reviewResult.Status == "APPROVED"
            ? DateTime.UtcNow
            : null;

        expertProfile.UpdatedAt = DateTime.UtcNow;

        _expertProfileRepository.RemoveCertificates(expertProfile.Certificates);

        expertProfile.Certificates = BuildCertificates(request);

        ApplyUserStatusByReview(user, reviewResult.Status);

        await _expertProfileRepository.SaveChangesAsync();

        return ToResponse(expertProfile);
    }

    public async Task<ExpertProfileResponse> GetMeAsync(int userId)
    {
        var expertProfile = await _expertProfileRepository.GetByUserIdAsync(userId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        return ToResponse(expertProfile);
    }

    private async Task<ExpertProfileReviewProviderResult> ReviewByAiAsync(
        CreateExpertProfileRequest request
    )
    {
        var urlTargets = BuildUrlInspectionTargets(request);

        var urlInspectionResults = await _urlInspectionService.InspectAsync(urlTargets);

        var aiReviewRequest = new ExpertProfileReviewProviderRequest
        {
            ProfessionalTitle = request.ProfessionalTitle.Trim(),
            Bio = request.Bio.Trim(),
            Skills = request.Skills.Trim(),
            YearsOfExperience = request.YearsOfExperience,
            ExpectedProjectBudgetMin = request.ExpectedProjectBudgetMin,
            ExpectedProjectBudgetMax = request.ExpectedProjectBudgetMax,
            PreferredProjectDurationDays = request.PreferredProjectDurationDays,
            AvailableForWork = request.AvailableForWork,
            PortfolioUrl = NormalizeNullable(request.PortfolioUrl),
            LinkedInUrl = NormalizeNullable(request.LinkedInUrl),
            GitHubUrl = NormalizeNullable(request.GitHubUrl),
            Certificates = request.Certificates.Select(x => new ExpertProfileReviewCertificateItem
            {
                CertificateName = x.CertificateName.Trim(),
                CertificateIssuer = x.CertificateIssuer.Trim(),
                CertificateUrl = x.CertificateUrl.Trim(),
                IssuedAt = x.IssuedAt
            }).ToList(),
            UrlInspectionResults = urlInspectionResults
        };

        return await _expertProfileReviewProvider.ReviewAsync(aiReviewRequest);
    }

    private static void ApplyUserStatusByReview(User user, string reviewStatus)
    {
        user.Status = reviewStatus switch
        {
            "APPROVED" => "ACTIVE",
            "NEEDS_CORRECTION" => "PENDING_PROFILE",
            "PENDING_REVIEW" => "PENDING_AI_REVIEW",
            _ => "PENDING_AI_REVIEW"
        };

        user.UpdatedAt = DateTime.UtcNow;
    }

    private static bool CanResubmit(string userStatus, string profileReviewStatus)
    {
        var allowedUserStatuses = new[]
        {
            "PENDING_PROFILE",
            "PENDING_AI_REVIEW"
        };

        var allowedProfileStatuses = new[]
        {
            "NEEDS_CORRECTION",
            "PENDING_REVIEW",
            "REJECTED"
        };

        return allowedUserStatuses.Contains(userStatus)
            && allowedProfileStatuses.Contains(profileReviewStatus);
    }

    private static List<ExpertCertificate> BuildCertificates(
        CreateExpertProfileRequest request
    )
    {
        return request.Certificates.Select(x => new ExpertCertificate
        {
            CertificateName = x.CertificateName.Trim(),
            CertificateIssuer = x.CertificateIssuer.Trim(),
            CertificateUrl = x.CertificateUrl.Trim(),
            IssuedAt = x.IssuedAt,
            CreatedAt = DateTime.UtcNow
        }).ToList();
    }

    private static void ValidateRequest(CreateExpertProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ProfessionalTitle))
        {
            throw new InvalidOperationException("Professional title is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Bio))
        {
            throw new InvalidOperationException("Bio is required.");
        }

        if (request.Bio.Trim().Length < 50)
        {
            throw new InvalidOperationException("Bio must be at least 50 characters.");
        }

        if (string.IsNullOrWhiteSpace(request.Skills))
        {
            throw new InvalidOperationException("Skills are required.");
        }

        if (request.Skills.Trim().Length < 10)
        {
            throw new InvalidOperationException("Skills must be more specific.");
        }

        if (request.YearsOfExperience < 0)
        {
            throw new InvalidOperationException(
                "Years of experience must be greater than or equal to 0."
            );
        }

        if (request.ExpectedProjectBudgetMin < 0)
        {
            throw new InvalidOperationException(
                "Expected project budget min must be greater than or equal to 0."
            );
        }

        if (request.ExpectedProjectBudgetMax < request.ExpectedProjectBudgetMin)
        {
            throw new InvalidOperationException(
                "Expected project budget max must be greater than or equal to min budget."
            );
        }

        if (request.PreferredProjectDurationDays <= 0)
        {
            throw new InvalidOperationException(
                "Preferred project duration days must be greater than 0."
            );
        }

        if (request.Certificates.Count > 10)
        {
            throw new InvalidOperationException("Maximum 10 certificates are allowed.");
        }

        var duplicateCertificateUrls = request.Certificates
            .Where(x => !string.IsNullOrWhiteSpace(x.CertificateUrl))
            .GroupBy(x => x.CertificateUrl.Trim().ToLower())
            .Any(g => g.Count() > 1);

        if (duplicateCertificateUrls)
        {
            throw new InvalidOperationException("Duplicate certificate URLs are not allowed.");
        }

        foreach (var certificate in request.Certificates)
        {
            if (string.IsNullOrWhiteSpace(certificate.CertificateName))
            {
                throw new InvalidOperationException("Certificate name is required.");
            }

            if (string.IsNullOrWhiteSpace(certificate.CertificateIssuer))
            {
                throw new InvalidOperationException("Certificate issuer is required.");
            }

            if (string.IsNullOrWhiteSpace(certificate.CertificateUrl))
            {
                throw new InvalidOperationException("Certificate URL is required.");
            }

            if (!IsValidUrl(certificate.CertificateUrl))
            {
                throw new InvalidOperationException("Certificate URL is invalid.");
            }
        }

        if (!string.IsNullOrWhiteSpace(request.AvatarUrl) && !IsValidUrl(request.AvatarUrl))
        {
            throw new InvalidOperationException("Avatar URL is invalid.");
        }

        if (!string.IsNullOrWhiteSpace(request.PortfolioUrl) && !IsValidUrl(request.PortfolioUrl))
        {
            throw new InvalidOperationException("Portfolio URL is invalid.");
        }

        if (!string.IsNullOrWhiteSpace(request.LinkedInUrl) && !IsValidUrl(request.LinkedInUrl))
        {
            throw new InvalidOperationException("LinkedIn URL is invalid.");
        }

        if (!string.IsNullOrWhiteSpace(request.GitHubUrl) && !IsValidUrl(request.GitHubUrl))
        {
            throw new InvalidOperationException("GitHub URL is invalid.");
        }
    }

    private static List<UrlInspectionTarget> BuildUrlInspectionTargets(
        CreateExpertProfileRequest request
    )
    {
        var targets = new List<UrlInspectionTarget>();

        if (!string.IsNullOrWhiteSpace(request.PortfolioUrl))
        {
            targets.Add(new UrlInspectionTarget
            {
                Label = "Portfolio URL",
                Url = request.PortfolioUrl.Trim(),
                IsRequiredProof = true
            });
        }

        if (!string.IsNullOrWhiteSpace(request.GitHubUrl))
        {
            targets.Add(new UrlInspectionTarget
            {
                Label = "GitHub URL",
                Url = request.GitHubUrl.Trim(),
                IsRequiredProof = true
            });
        }

        if (!string.IsNullOrWhiteSpace(request.LinkedInUrl))
        {
            targets.Add(new UrlInspectionTarget
            {
                Label = "LinkedIn URL",
                Url = request.LinkedInUrl.Trim(),
                IsRequiredProof = false
            });
        }

        foreach (var certificate in request.Certificates)
        {
            targets.Add(new UrlInspectionTarget
            {
                Label = $"Certificate URL - {certificate.CertificateName}",
                Url = certificate.CertificateUrl.Trim(),
                IsRequiredProof = true
            });
        }

        return targets;
    }

    private static bool IsValidUrl(string value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static string? NormalizeNullable(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static ExpertProfileResponse ToResponse(ExpertProfile expertProfile)
    {
        return new ExpertProfileResponse
        {
            ExpertProfileId = expertProfile.ExpertProfileId,
            UserId = expertProfile.UserId,
            Email = expertProfile.User.Email,
            FullName = expertProfile.User.FullName,
            AvatarUrl = expertProfile.User.AvatarUrl,
            ProfessionalTitle = expertProfile.ProfessionalTitle,
            Bio = expertProfile.Bio,
            Skills = expertProfile.Skills,
            YearsOfExperience = expertProfile.YearsOfExperience,
            ExpectedProjectBudgetMin = expertProfile.ExpectedProjectBudgetMin,
            ExpectedProjectBudgetMax = expertProfile.ExpectedProjectBudgetMax,
            PreferredProjectDurationDays = expertProfile.PreferredProjectDurationDays,
            AvailableForWork = expertProfile.AvailableForWork,
            PortfolioUrl = expertProfile.PortfolioUrl,
            LinkedInUrl = expertProfile.LinkedInUrl,
            GitHubUrl = expertProfile.GitHubUrl,
            ExpertCategory = expertProfile.ExpertCategory,
            ProfileScore = expertProfile.ProfileScore,
            Level = expertProfile.Level,
            ProfileReviewStatus = expertProfile.ProfileReviewStatus,
            ProfileReviewNote = expertProfile.ProfileReviewNote,
            MissingInformation = expertProfile.MissingInformation,
            VerifiedAt = expertProfile.VerifiedAt,
            UserStatus = expertProfile.User.Status,
            CreatedAt = expertProfile.CreatedAt,
            UpdatedAt = expertProfile.UpdatedAt,
            Certificates = expertProfile.Certificates
                .Select(x => new ExpertCertificateResponse
                {
                    ExpertCertificateId = x.ExpertCertificateId,
                    CertificateName = x.CertificateName,
                    CertificateIssuer = x.CertificateIssuer,
                    CertificateUrl = x.CertificateUrl,
                    IssuedAt = x.IssuedAt,
                    CreatedAt = x.CreatedAt
                })
                .ToList()
        };
    }
}