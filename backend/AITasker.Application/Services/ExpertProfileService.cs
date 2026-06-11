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
    private readonly IExpertSkillService _expertSkillService;
    private readonly ICertificateVerificationService _certificateVerificationService;

    public ExpertProfileService(
        IExpertProfileRepository expertProfileRepository,
        IExpertProfileReviewProvider expertProfileReviewProvider,
        IUrlInspectionService urlInspectionService,
        IExpertSkillService expertSkillService,
        ICertificateVerificationService certificateVerificationService
    )
    {
        _expertProfileRepository = expertProfileRepository;
        _expertProfileReviewProvider = expertProfileReviewProvider;
        _urlInspectionService = urlInspectionService;
        _expertSkillService = expertSkillService;
        _certificateVerificationService = certificateVerificationService;
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

        var certificateVerificationResults = await VerifyCertificatesAsync(request);

        var experienceVerification = BuildInitialExperienceVerification(
            request,
            certificateVerificationResults
        );

        var reviewResult = await ReviewByAiAsync(request);

        var finalReviewStatus = ResolveFinalReviewStatus(
            reviewResult.Status,
            request.YearsOfExperience,
            experienceVerification
        );

        var finalLevel = ResolveFinalLevel(
            reviewResult.Level,
            experienceVerification.VerifiedYearsOfExperience,
            finalReviewStatus
        );

        var finalReviewNote = BuildFinalProfileReviewNote(
            reviewResult.ReviewNote,
            experienceVerification.ExperienceVerificationNote,
            reviewResult.Status,
            finalReviewStatus
        );

        var expertProfile = new ExpertProfile
        {
            UserId = userId,
            ProfessionalTitle = request.ProfessionalTitle.Trim(),
            Bio = request.Bio.Trim(),
            Skills = request.Skills.Trim(),
            YearsOfExperience = request.YearsOfExperience,

            VerifiedYearsOfExperience = experienceVerification.VerifiedYearsOfExperience,
            ExperienceConfidenceScore = experienceVerification.ExperienceConfidenceScore,
            ExperienceVerificationStatus = experienceVerification.ExperienceVerificationStatus,
            ExperienceVerificationNote = experienceVerification.ExperienceVerificationNote,

            ExpectedProjectBudgetMin = request.ExpectedProjectBudgetMin,
            ExpectedProjectBudgetMax = request.ExpectedProjectBudgetMax,
            PreferredProjectDurationDays = request.PreferredProjectDurationDays,
            AvailableForWork = request.AvailableForWork,
            PortfolioUrl = NormalizeNullable(request.PortfolioUrl),
            LinkedInUrl = NormalizeNullable(request.LinkedInUrl),
            GitHubUrl = NormalizeNullable(request.GitHubUrl),

            ExpertCategory = reviewResult.ExpertCategory,
            ProfileScore = reviewResult.ProfileScore,
            Level = finalLevel,
            ProfileReviewStatus = finalReviewStatus,
            ProfileReviewNote = finalReviewNote,
            MissingInformation = reviewResult.MissingInformation,
            VerifiedAt = finalReviewStatus == "APPROVED"
                ? DateTime.UtcNow
                : null,

            CreatedAt = DateTime.UtcNow,
            Certificates = BuildCertificates(request, certificateVerificationResults)
        };

        ApplyUserStatusByReview(user, finalReviewStatus);

        await _expertProfileRepository.AddAsync(expertProfile);
        await _expertProfileRepository.SaveChangesAsync();

        await _expertSkillService.SyncFromProfileSkillsAsync(
            expertProfile.ExpertProfileId,
            expertProfile.Skills,
            expertProfile.VerifiedYearsOfExperience > 0
                ? expertProfile.VerifiedYearsOfExperience
                : expertProfile.YearsOfExperience
        );

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

        var certificateVerificationResults = await VerifyCertificatesAsync(request);

        var experienceVerification = BuildInitialExperienceVerification(
            request,
            certificateVerificationResults
        );

        var reviewResult = await ReviewByAiAsync(request);

        var finalReviewStatus = ResolveFinalReviewStatus(
            reviewResult.Status,
            request.YearsOfExperience,
            experienceVerification
        );

        var finalLevel = ResolveFinalLevel(
            reviewResult.Level,
            experienceVerification.VerifiedYearsOfExperience,
            finalReviewStatus
        );

        var finalReviewNote = BuildFinalProfileReviewNote(
            reviewResult.ReviewNote,
            experienceVerification.ExperienceVerificationNote,
            reviewResult.Status,
            finalReviewStatus
        );

        expertProfile.ProfessionalTitle = request.ProfessionalTitle.Trim();
        expertProfile.Bio = request.Bio.Trim();
        expertProfile.Skills = request.Skills.Trim();
        expertProfile.YearsOfExperience = request.YearsOfExperience;

        expertProfile.VerifiedYearsOfExperience = experienceVerification.VerifiedYearsOfExperience;
        expertProfile.ExperienceConfidenceScore = experienceVerification.ExperienceConfidenceScore;
        expertProfile.ExperienceVerificationStatus = experienceVerification.ExperienceVerificationStatus;
        expertProfile.ExperienceVerificationNote = experienceVerification.ExperienceVerificationNote;

        expertProfile.ExpectedProjectBudgetMin = request.ExpectedProjectBudgetMin;
        expertProfile.ExpectedProjectBudgetMax = request.ExpectedProjectBudgetMax;
        expertProfile.PreferredProjectDurationDays = request.PreferredProjectDurationDays;
        expertProfile.AvailableForWork = request.AvailableForWork;
        expertProfile.PortfolioUrl = NormalizeNullable(request.PortfolioUrl);
        expertProfile.LinkedInUrl = NormalizeNullable(request.LinkedInUrl);
        expertProfile.GitHubUrl = NormalizeNullable(request.GitHubUrl);

        expertProfile.ExpertCategory = reviewResult.ExpertCategory;
        expertProfile.ProfileScore = reviewResult.ProfileScore;
        expertProfile.Level = finalLevel;
        expertProfile.ProfileReviewStatus = finalReviewStatus;
        expertProfile.ProfileReviewNote = finalReviewNote;
        expertProfile.MissingInformation = reviewResult.MissingInformation;
        expertProfile.VerifiedAt = finalReviewStatus == "APPROVED"
            ? DateTime.UtcNow
            : null;

        expertProfile.UpdatedAt = DateTime.UtcNow;

        _expertProfileRepository.RemoveCertificates(expertProfile.Certificates);

        expertProfile.Certificates = BuildCertificates(
            request,
            certificateVerificationResults
        );

        ApplyUserStatusByReview(user, finalReviewStatus);

        await _expertProfileRepository.SaveChangesAsync();

        await _expertSkillService.SyncFromProfileSkillsAsync(
            expertProfile.ExpertProfileId,
            expertProfile.Skills,
            expertProfile.VerifiedYearsOfExperience > 0
                ? expertProfile.VerifiedYearsOfExperience
                : expertProfile.YearsOfExperience
        );

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

    private async Task<List<CertificateVerificationResult>> VerifyCertificatesAsync(
        CreateExpertProfileRequest request
    )
    {
        if (request.Certificates.Count == 0)
        {
            return new List<CertificateVerificationResult>();
        }

        var verificationRequests = request.Certificates
            .Select(x => new CertificateVerificationRequest
            {
                CertificateName = x.CertificateName.Trim(),
                CertificateIssuer = x.CertificateIssuer.Trim(),
                CertificateUrl = x.CertificateUrl.Trim(),
                IssuedAt = x.IssuedAt,
                ExpertBio = request.Bio.Trim(),
                ExpertSkillsText = request.Skills.Trim()
            })
            .ToList();

        return await _certificateVerificationService.VerifyManyAsync(
            verificationRequests
        );
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

    private static ExperienceVerificationSnapshot BuildInitialExperienceVerification(
        CreateExpertProfileRequest request,
        List<CertificateVerificationResult> certificateVerificationResults
    )
    {
        var claimedYears = Math.Clamp(request.YearsOfExperience, 0, 50);

        var hasVerifiedCertificate = certificateVerificationResults.Any(x =>
            x.VerificationStatus == "VERIFIED"
        );

        var hasNeedsReviewCertificate = certificateVerificationResults.Any(x =>
            x.VerificationStatus == "NEEDS_REVIEW"
        );

        var hasSuspiciousOrInvalidCertificate = certificateVerificationResults.Any(x =>
            x.VerificationStatus is "SUSPICIOUS" or "INVALID"
        );

        var hasAnyCertificate = certificateVerificationResults.Count > 0;

        var proofUrlCount = CountProvidedProofUrls(request);

        var hasEvidenceUrl = proofUrlCount >= 2;

        var maxCertificateScore = certificateVerificationResults.Count == 0
            ? 0m
            : certificateVerificationResults.Max(x => x.VerificationScore);

        var averageCertificateScore = certificateVerificationResults.Count == 0
            ? 0m
            : certificateVerificationResults.Average(x => x.VerificationScore);

        var confidence = 20m;

        if (proofUrlCount >= 3)
        {
            confidence += 30m;
        }
        else if (proofUrlCount >= 2)
        {
            confidence += 20m;
        }

        if (hasVerifiedCertificate)
        {
            confidence += 35m;
        }
        else if (hasNeedsReviewCertificate)
        {
            confidence += 20m;
        }
        else if (hasAnyCertificate)
        {
            confidence += 5m;
        }

        if (!string.IsNullOrWhiteSpace(request.Bio) && request.Bio.Trim().Length >= 120)
        {
            confidence += 10m;
        }

        if (maxCertificateScore >= 80m)
        {
            confidence += 15m;
        }
        else if (averageCertificateScore >= 50m)
        {
            confidence += 8m;
        }

        if (hasSuspiciousOrInvalidCertificate)
        {
            confidence -= 20m;
        }

        confidence = Math.Clamp(confidence, 0m, 100m);

        var verifiedYears = claimedYears;

        if (claimedYears >= 7 && confidence < 70m)
        {
            verifiedYears = Math.Min(claimedYears, 2);
        }
        else if (claimedYears >= 5 && confidence < 60m)
        {
            verifiedYears = Math.Min(claimedYears, 2);
        }
        else if (claimedYears >= 3 && confidence < 45m)
        {
            verifiedYears = Math.Min(claimedYears, 1);
        }

        var gap = claimedYears - verifiedYears;

        var status = "UNVERIFIED";

        if (confidence >= 75m && gap <= 1)
        {
            status = "VERIFIED";
        }
        else if (gap >= 3 || (claimedYears >= 5 && confidence < 60m))
        {
            status = "NEEDS_EVIDENCE";
        }
        else if (hasSuspiciousOrInvalidCertificate && claimedYears >= 3)
        {
            status = "SUSPICIOUS";
        }
        else if (confidence >= 45m)
        {
            status = "NEEDS_EVIDENCE";
        }

        var note = BuildExperienceVerificationNote(
            claimedYears,
            verifiedYears,
            confidence,
            status,
            certificateVerificationResults,
            hasEvidenceUrl,
            proofUrlCount
        );

        return new ExperienceVerificationSnapshot
        {
            VerifiedYearsOfExperience = verifiedYears,
            ExperienceConfidenceScore = confidence,
            ExperienceVerificationStatus = status,
            ExperienceVerificationNote = note
        };
    }

    private static string ResolveFinalReviewStatus(
        string aiReviewStatus,
        int claimedYearsOfExperience,
        ExperienceVerificationSnapshot experienceVerification
    )
    {
        var normalizedAiStatus = NormalizeReviewStatus(aiReviewStatus);

        if (normalizedAiStatus == "REJECTED")
        {
            return "REJECTED";
        }

        var claimedYears = Math.Clamp(claimedYearsOfExperience, 0, 50);

        var verifiedYears = Math.Clamp(
            experienceVerification.VerifiedYearsOfExperience,
            0,
            50
        );

        var gap = claimedYears - verifiedYears;
        var confidence = experienceVerification.ExperienceConfidenceScore;
        var experienceStatus = experienceVerification.ExperienceVerificationStatus;

        if (string.Equals(experienceStatus, "SUSPICIOUS", StringComparison.OrdinalIgnoreCase))
        {
            return "NEEDS_CORRECTION";
        }

        if (gap >= 3)
        {
            return "NEEDS_CORRECTION";
        }

        if (claimedYears >= 7 && confidence < 70m)
        {
            return "NEEDS_CORRECTION";
        }

        if (claimedYears >= 5 && confidence < 60m)
        {
            return "NEEDS_CORRECTION";
        }

        if (normalizedAiStatus == "APPROVED"
            && claimedYears >= 3
            && string.Equals(experienceStatus, "NEEDS_EVIDENCE", StringComparison.OrdinalIgnoreCase)
            && confidence < 45m)
        {
            return "NEEDS_CORRECTION";
        }

        return normalizedAiStatus;
    }

    private static string ResolveFinalLevel(
        string? aiLevel,
        int verifiedYearsOfExperience,
        string finalReviewStatus
    )
    {
        var normalizedAiLevel = NormalizeProfileLevel(aiLevel);
        var levelFromVerifiedYears = InferLevelFromVerifiedYears(verifiedYearsOfExperience);

        if (!string.Equals(finalReviewStatus, "APPROVED", StringComparison.OrdinalIgnoreCase))
        {
            return levelFromVerifiedYears;
        }

        return CapLevelByVerifiedYears(normalizedAiLevel, verifiedYearsOfExperience);
    }

    private static string CapLevelByVerifiedYears(
        string normalizedAiLevel,
        int verifiedYearsOfExperience
    )
    {
        var verifiedYears = Math.Clamp(verifiedYearsOfExperience, 0, 50);

        if (verifiedYears < 1)
        {
            return "FRESHER";
        }

        if (verifiedYears < 2
            && GetProfileLevelRank(normalizedAiLevel) > GetProfileLevelRank("JUNIOR"))
        {
            return "JUNIOR";
        }

        if (verifiedYears < 5
            && GetProfileLevelRank(normalizedAiLevel) > GetProfileLevelRank("MID_LEVEL"))
        {
            return "MID_LEVEL";
        }

        if (verifiedYears < 7
            && GetProfileLevelRank(normalizedAiLevel) > GetProfileLevelRank("SENIOR"))
        {
            return "SENIOR";
        }

        return normalizedAiLevel;
    }

    private static string InferLevelFromVerifiedYears(int verifiedYearsOfExperience)
    {
        var verifiedYears = Math.Clamp(verifiedYearsOfExperience, 0, 50);

        if (verifiedYears <= 1)
        {
            return "FRESHER";
        }

        if (verifiedYears <= 2)
        {
            return "JUNIOR";
        }

        if (verifiedYears <= 4)
        {
            return "MID_LEVEL";
        }

        if (verifiedYears <= 6)
        {
            return "SENIOR";
        }

        return "LEAD";
    }

    private static int GetProfileLevelRank(string level)
    {
        return NormalizeProfileLevel(level) switch
        {
            "FRESHER" => 1,
            "JUNIOR" => 2,
            "MID_LEVEL" => 3,
            "SENIOR" => 4,
            "LEAD" => 5,
            _ => 1
        };
    }

    private static string NormalizeReviewStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "PENDING_REVIEW";
        }

        var normalized = status.Trim()
            .ToUpper()
            .Replace("-", "_")
            .Replace(" ", "_");

        return normalized switch
        {
            "APPROVED" => "APPROVED",
            "NEEDS_CORRECTION" => "NEEDS_CORRECTION",
            "PENDING_REVIEW" => "PENDING_REVIEW",
            "REJECTED" => "REJECTED",
            _ => "PENDING_REVIEW"
        };
    }

    private static string BuildFinalProfileReviewNote(
        string? aiReviewNote,
        string? experienceNote,
        string aiReviewStatus,
        string finalReviewStatus
    )
    {
        var notes = new List<string>();

        if (!string.IsNullOrWhiteSpace(aiReviewNote))
        {
            notes.Add(aiReviewNote.Trim());
        }

        if (!string.IsNullOrWhiteSpace(experienceNote))
        {
            notes.Add(experienceNote.Trim());
        }

        if (!string.Equals(aiReviewStatus, finalReviewStatus, StringComparison.OrdinalIgnoreCase))
        {
            notes.Add(
                $"Backend verification changed profile review status from {aiReviewStatus} to {finalReviewStatus} because claimed experience is not supported by enough evidence."
            );
        }

        return string.Join(" ", notes);
    }

    private static string BuildExperienceVerificationNote(
        int claimedYears,
        int verifiedYears,
        decimal confidence,
        string status,
        List<CertificateVerificationResult> certificateVerificationResults,
        bool hasEvidenceUrl,
        int proofUrlCount
    )
    {
        var notes = new List<string>
        {
            $"Claimed years: {claimedYears}. Initial verified years: {verifiedYears}. Confidence score: {confidence:0.##}. Status: {status}. Proof URL count: {proofUrlCount}/3."
        };

        if (!hasEvidenceUrl)
        {
            notes.Add("Less than two proof URLs were provided.");
        }

        if (certificateVerificationResults.Count == 0)
        {
            notes.Add("No certificates were provided.");
        }
        else
        {
            var verifiedCount = certificateVerificationResults.Count(x =>
                x.VerificationStatus == "VERIFIED"
            );

            var needsReviewCount = certificateVerificationResults.Count(x =>
                x.VerificationStatus == "NEEDS_REVIEW"
            );

            var suspiciousCount = certificateVerificationResults.Count(x =>
                x.VerificationStatus == "SUSPICIOUS"
            );

            var invalidCount = certificateVerificationResults.Count(x =>
                x.VerificationStatus == "INVALID"
            );

            notes.Add(
                $"Certificate verification summary: {verifiedCount} verified, {needsReviewCount} needs review, {suspiciousCount} suspicious, {invalidCount} invalid."
            );
        }

        if (claimedYears - verifiedYears >= 3)
        {
            notes.Add(
                "Claimed experience is much higher than the available evidence. Additional evidence is required."
            );
        }

        return string.Join(" ", notes);
    }

    private static List<ExpertCertificate> BuildCertificates(
        CreateExpertProfileRequest request,
        List<CertificateVerificationResult> verificationResults
    )
    {
        return request.Certificates.Select(x =>
        {
            var verificationResult = verificationResults.FirstOrDefault(result =>
                NormalizeUrl(result.CertificateUrl) == NormalizeUrl(x.CertificateUrl)
            );

            return new ExpertCertificate
            {
                CertificateName = x.CertificateName.Trim(),
                CertificateIssuer = x.CertificateIssuer.Trim(),
                CertificateUrl = x.CertificateUrl.Trim(),
                IssuedAt = x.IssuedAt,
                CreatedAt = DateTime.UtcNow,

                VerificationStatus = verificationResult?.VerificationStatus ?? "UNVERIFIED",
                VerificationScore = verificationResult?.VerificationScore ?? 0,
                VerificationNote = verificationResult?.VerificationNote,
                DetectedIssuer = verificationResult?.DetectedIssuer,
                DetectedCertificateName = verificationResult?.DetectedCertificateName,
                CheckedAt = verificationResult?.CheckedAt
            };
        }).ToList();
    }

    private static void ApplyUserStatusByReview(User user, string reviewStatus)
    {
        user.Status = reviewStatus switch
        {
            "APPROVED" => "ACTIVE",
            "NEEDS_CORRECTION" => "PENDING_PROFILE",
            "PENDING_REVIEW" => "PENDING_AI_REVIEW",
            "REJECTED" => "PENDING_PROFILE",
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

        var proofUrlCount = CountProvidedProofUrls(request);

        if (proofUrlCount < 2)
        {
            throw new InvalidOperationException(
                "At least 2 of Portfolio URL, LinkedIn URL, and GitHub URL are required."
            );
        }

        if (request.Certificates.Count == 0)
        {
            throw new InvalidOperationException("At least one certificate is required.");
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

    private static int CountProvidedProofUrls(CreateExpertProfileRequest request)
    {
        var count = 0;

        if (!string.IsNullOrWhiteSpace(request.PortfolioUrl))
        {
            count++;
        }

        if (!string.IsNullOrWhiteSpace(request.LinkedInUrl))
        {
            count++;
        }

        if (!string.IsNullOrWhiteSpace(request.GitHubUrl))
        {
            count++;
        }

        return count;
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
                IsRequiredProof = true
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

    private static string NormalizeUrl(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();
    }

    private static string NormalizeProfileLevel(string? level)
    {
        if (string.IsNullOrWhiteSpace(level))
        {
            return "FRESHER";
        }

        var normalized = level.Trim()
            .ToUpper()
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
            _ => "FRESHER"
        };
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
            VerifiedYearsOfExperience = expertProfile.VerifiedYearsOfExperience,
            ExperienceConfidenceScore = expertProfile.ExperienceConfidenceScore,
            ExperienceVerificationStatus = expertProfile.ExperienceVerificationStatus,
            ExperienceVerificationNote = expertProfile.ExperienceVerificationNote,
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
                    CreatedAt = x.CreatedAt,
                    VerificationStatus = x.VerificationStatus,
                    VerificationScore = x.VerificationScore,
                    VerificationNote = x.VerificationNote,
                    DetectedIssuer = x.DetectedIssuer,
                    DetectedCertificateName = x.DetectedCertificateName,
                    CheckedAt = x.CheckedAt
                })
                .ToList()
        };
    }

    private class ExperienceVerificationSnapshot
    {
        public int VerifiedYearsOfExperience { get; set; }

        public decimal ExperienceConfidenceScore { get; set; }

        public string ExperienceVerificationStatus { get; set; } = "UNVERIFIED";

        public string? ExperienceVerificationNote { get; set; }
    }
}