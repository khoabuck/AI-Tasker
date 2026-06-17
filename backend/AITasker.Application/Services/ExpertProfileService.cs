using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class ExpertProfileService : IExpertProfileService
{
    private const int MaxExpertProfileReviewSubmissions = 5;

    private static readonly TimeSpan ExpertProfileReviewLockDuration =
        TimeSpan.FromHours(24);

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
        ValidateCreateOrResubmitRequest(request);

        var user = await _expertProfileRepository.GetUserByIdAsync(userId);

        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        if (!string.Equals(user.Role, "EXPERT", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Only EXPERT users can create an expert profile."
            );
        }

        if (!string.Equals(
                user.Status,
                "PENDING_PROFILE",
                StringComparison.OrdinalIgnoreCase
            ))
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

        var now = DateTime.UtcNow;

        var reviewSnapshot = await ReviewFullProfileAsync(request);

        var expertProfile = new ExpertProfile
        {
            UserId = userId,
            ProfessionalTitle = request.ProfessionalTitle.Trim(),
            Bio = request.Bio.Trim(),
            Skills = request.Skills.Trim(),
            YearsOfExperience = request.YearsOfExperience,

            VerifiedYearsOfExperience = reviewSnapshot.VerifiedYearsOfExperience,
            ExperienceConfidenceScore = reviewSnapshot.ExperienceConfidenceScore,
            ExperienceVerificationStatus = reviewSnapshot.ExperienceVerificationStatus,
            ExperienceVerificationNote = reviewSnapshot.ExperienceVerificationNote,

            AvailableForWork = request.AvailableForWork,
            PortfolioUrl = NormalizeNullable(request.PortfolioUrl),
            LinkedInUrl = NormalizeNullable(request.LinkedInUrl),
            GitHubUrl = NormalizeNullable(request.GitHubUrl),

            ExpertCategory = reviewSnapshot.ExpertCategory,
            ProfileScore = reviewSnapshot.ProfileScore,
            Level = reviewSnapshot.Level,
            ProfileReviewStatus = reviewSnapshot.ProfileReviewStatus,
            ProfileReviewNote = reviewSnapshot.ProfileReviewNote,
            MissingInformation = reviewSnapshot.MissingInformation,
            ProfileReviewSubmissionCount = GetInitialProfileReviewSubmissionCount(
                reviewSnapshot.ProfileReviewStatus
            ),
            ProfileReviewLockedUntil = null,
            VerifiedAt = reviewSnapshot.ProfileReviewStatus == "APPROVED"
                ? now
                : null,

            CreatedAt = now,
            Certificates = BuildCertificates(
                request,
                reviewSnapshot.CertificateVerificationResults
            )
        };

        ApplyProfileReviewResultAndUserStatus(
            expertProfile,
            user,
            reviewSnapshot.ProfileReviewStatus,
            now
        );

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
        ValidateCreateOrResubmitRequest(request);

        var expertProfile = await _expertProfileRepository.GetByUserIdAsync(userId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        var user = expertProfile.User;

        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        if (!string.Equals(user.Role, "EXPERT", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Only EXPERT users can resubmit an expert profile."
            );
        }

        if (string.Equals(
                expertProfile.ProfileReviewStatus,
                "APPROVED",
                StringComparison.OrdinalIgnoreCase
            ))
        {
            throw new InvalidOperationException(
                "Approved expert profile cannot be resubmitted. Use update profile API instead."
            );
        }

        var now = DateTime.UtcNow;

        ResetExpiredProfileReviewLockIfNeeded(expertProfile, user, now);

        if (IsProfileReviewLocked(expertProfile, now))
        {
            throw new InvalidOperationException(
                $"Expert profile review is locked until {expertProfile.ProfileReviewLockedUntil:O}. Please try again later."
            );
        }

        if (ShouldLockBeforeNextExpertReviewAttempt(expertProfile))
        {
            LockExpertProfileReview(expertProfile, user, now);

            await _expertProfileRepository.SaveChangesAsync();

            throw new InvalidOperationException(
                $"Expert profile review is locked until {expertProfile.ProfileReviewLockedUntil:O} because too many failed submissions were made."
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

        var reviewSnapshot = await ReviewFullProfileAsync(request);

        expertProfile.ProfessionalTitle = request.ProfessionalTitle.Trim();
        expertProfile.Bio = request.Bio.Trim();
        expertProfile.Skills = request.Skills.Trim();
        expertProfile.YearsOfExperience = request.YearsOfExperience;

        expertProfile.VerifiedYearsOfExperience =
            reviewSnapshot.VerifiedYearsOfExperience;
        expertProfile.ExperienceConfidenceScore =
            reviewSnapshot.ExperienceConfidenceScore;
        expertProfile.ExperienceVerificationStatus =
            reviewSnapshot.ExperienceVerificationStatus;
        expertProfile.ExperienceVerificationNote =
            reviewSnapshot.ExperienceVerificationNote;

        expertProfile.AvailableForWork = request.AvailableForWork;
        expertProfile.PortfolioUrl = NormalizeNullable(request.PortfolioUrl);
        expertProfile.LinkedInUrl = NormalizeNullable(request.LinkedInUrl);
        expertProfile.GitHubUrl = NormalizeNullable(request.GitHubUrl);

        expertProfile.ExpertCategory = reviewSnapshot.ExpertCategory;
        expertProfile.ProfileScore = reviewSnapshot.ProfileScore;
        expertProfile.Level = reviewSnapshot.Level;
        expertProfile.ProfileReviewStatus = reviewSnapshot.ProfileReviewStatus;
        expertProfile.ProfileReviewNote = reviewSnapshot.ProfileReviewNote;
        expertProfile.MissingInformation = reviewSnapshot.MissingInformation;
        expertProfile.VerifiedAt = reviewSnapshot.ProfileReviewStatus == "APPROVED"
            ? now
            : null;
        expertProfile.UpdatedAt = now;

        _expertProfileRepository.RemoveCertificates(expertProfile.Certificates);

        expertProfile.Certificates = BuildCertificates(
            request,
            reviewSnapshot.CertificateVerificationResults
        );

        ApplyProfileReviewResultAndUserStatus(
            expertProfile,
            user,
            reviewSnapshot.ProfileReviewStatus,
            now
        );

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

    public async Task<ExpertProfileResponse> UpdateBasicAsync(
        int userId,
        UpdateExpertBasicProfileRequest request
    )
    {
        ValidateBasicUpdateRequest(request);

        var expertProfile = await _expertProfileRepository.GetByUserIdAsync(userId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        var user = expertProfile.User;

        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        EnsureActiveExpertCanUpdate(user);

        user.FullName = request.FullName.Trim();

        if (request.AvatarUrl != null)
        {
            user.AvatarUrl = NormalizeNullable(request.AvatarUrl);
        }

        user.Status = "ACTIVE";
        user.UpdatedAt = DateTime.UtcNow;

        expertProfile.ProfessionalTitle = request.ProfessionalTitle.Trim();
        expertProfile.Bio = request.Bio.Trim();
        expertProfile.AvailableForWork = request.AvailableForWork;
        expertProfile.UpdatedAt = DateTime.UtcNow;

        await _expertProfileRepository.SaveChangesAsync();

        return ToResponse(expertProfile);
    }

    public async Task<ExpertVerificationUpdateResponse> UpdateVerificationAsync(
        int userId,
        UpdateExpertVerificationProfileRequest request
    )
    {
        ValidateVerificationUpdateRequest(request);

        var expertProfile = await _expertProfileRepository.GetByUserIdAsync(userId);

        if (expertProfile == null)
        {
            throw new InvalidOperationException("Expert profile not found.");
        }

        var user = expertProfile.User;

        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        EnsureActiveExpertCanUpdate(user);

        var reviewRequest = BuildReviewRequestFromVerificationUpdate(
            expertProfile,
            request
        );

        ValidateCreateOrResubmitRequest(reviewRequest);

        var reviewSnapshot = await ReviewFullProfileAsync(reviewRequest);

        var proposedCertificates = BuildProposedCertificateResponses(
            reviewRequest,
            reviewSnapshot.CertificateVerificationResults
        );

        if (reviewSnapshot.ProfileReviewStatus != "APPROVED")
        {
            user.Status = "ACTIVE";
            user.UpdatedAt = DateTime.UtcNow;

            await _expertProfileRepository.SaveChangesAsync();

            return new ExpertVerificationUpdateResponse
            {
                Applied = false,
                Message =
                    "Verification update needs correction. Existing expert profile was kept.",
                ProfileReviewStatus = reviewSnapshot.ProfileReviewStatus,
                ProfileReviewNote = reviewSnapshot.ProfileReviewNote,
                MissingInformation = reviewSnapshot.MissingInformation,
                ProfileScore = reviewSnapshot.ProfileScore,
                Level = reviewSnapshot.Level,
                ExpertCategory = reviewSnapshot.ExpertCategory,
                VerifiedYearsOfExperience =
                    reviewSnapshot.VerifiedYearsOfExperience,
                ExperienceConfidenceScore =
                    reviewSnapshot.ExperienceConfidenceScore,
                ExperienceVerificationStatus =
                    reviewSnapshot.ExperienceVerificationStatus,
                ExperienceVerificationNote =
                    reviewSnapshot.ExperienceVerificationNote,
                ProposedCertificates = proposedCertificates,
                CurrentProfile = ToResponse(expertProfile)
            };
        }

        expertProfile.Skills = reviewRequest.Skills.Trim();
        expertProfile.YearsOfExperience = reviewRequest.YearsOfExperience;
        expertProfile.PortfolioUrl = NormalizeNullable(reviewRequest.PortfolioUrl);
        expertProfile.LinkedInUrl = NormalizeNullable(reviewRequest.LinkedInUrl);
        expertProfile.GitHubUrl = NormalizeNullable(reviewRequest.GitHubUrl);

        expertProfile.VerifiedYearsOfExperience =
            reviewSnapshot.VerifiedYearsOfExperience;
        expertProfile.ExperienceConfidenceScore =
            reviewSnapshot.ExperienceConfidenceScore;
        expertProfile.ExperienceVerificationStatus =
            reviewSnapshot.ExperienceVerificationStatus;
        expertProfile.ExperienceVerificationNote =
            reviewSnapshot.ExperienceVerificationNote;

        expertProfile.ExpertCategory = reviewSnapshot.ExpertCategory;
        expertProfile.ProfileScore = reviewSnapshot.ProfileScore;
        expertProfile.Level = reviewSnapshot.Level;
        expertProfile.ProfileReviewStatus = reviewSnapshot.ProfileReviewStatus;
        expertProfile.ProfileReviewNote = reviewSnapshot.ProfileReviewNote;
        expertProfile.MissingInformation = reviewSnapshot.MissingInformation;
        expertProfile.VerifiedAt = DateTime.UtcNow;
        expertProfile.UpdatedAt = DateTime.UtcNow;

        _expertProfileRepository.RemoveCertificates(expertProfile.Certificates);

        expertProfile.Certificates = BuildCertificates(
            reviewRequest,
            reviewSnapshot.CertificateVerificationResults
        );

        user.Status = "ACTIVE";
        user.UpdatedAt = DateTime.UtcNow;

        await _expertProfileRepository.SaveChangesAsync();

        await _expertSkillService.SyncFromProfileSkillsAsync(
            expertProfile.ExpertProfileId,
            expertProfile.Skills,
            expertProfile.VerifiedYearsOfExperience > 0
                ? expertProfile.VerifiedYearsOfExperience
                : expertProfile.YearsOfExperience
        );

        return new ExpertVerificationUpdateResponse
        {
            Applied = true,
            Message = "Verification update approved and applied successfully.",
            ProfileReviewStatus = reviewSnapshot.ProfileReviewStatus,
            ProfileReviewNote = reviewSnapshot.ProfileReviewNote,
            MissingInformation = reviewSnapshot.MissingInformation,
            ProfileScore = reviewSnapshot.ProfileScore,
            Level = reviewSnapshot.Level,
            ExpertCategory = reviewSnapshot.ExpertCategory,
            VerifiedYearsOfExperience = reviewSnapshot.VerifiedYearsOfExperience,
            ExperienceConfidenceScore = reviewSnapshot.ExperienceConfidenceScore,
            ExperienceVerificationStatus =
                reviewSnapshot.ExperienceVerificationStatus,
            ExperienceVerificationNote =
                reviewSnapshot.ExperienceVerificationNote,
            ProposedCertificates = proposedCertificates,
            CurrentProfile = ToResponse(expertProfile)
        };
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

    private async Task<ReviewSnapshot> ReviewFullProfileAsync(
        CreateExpertProfileRequest request
    )
    {
        var certificateVerificationResults = await VerifyCertificatesAsync(request);

        var experienceVerification = BuildExperienceVerification(
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

        return new ReviewSnapshot
        {
            ProfileReviewStatus = finalReviewStatus,
            ProfileReviewNote = finalReviewNote,
            MissingInformation = reviewResult.MissingInformation,
            ProfileScore = reviewResult.ProfileScore,
            Level = finalLevel,
            ExpertCategory = reviewResult.ExpertCategory,

            VerifiedYearsOfExperience =
                experienceVerification.VerifiedYearsOfExperience,
            ExperienceConfidenceScore =
                experienceVerification.ExperienceConfidenceScore,
            ExperienceVerificationStatus =
                experienceVerification.ExperienceVerificationStatus,
            ExperienceVerificationNote =
                experienceVerification.ExperienceVerificationNote,

            CertificateVerificationResults = certificateVerificationResults
        };
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

        var urlInspectionResults = await _urlInspectionService.InspectAsync(
            urlTargets
        );

        var aiReviewRequest = new ExpertProfileReviewProviderRequest
        {
            ProfessionalTitle = request.ProfessionalTitle.Trim(),
            Bio = request.Bio.Trim(),
            Skills = request.Skills.Trim(),
            YearsOfExperience = request.YearsOfExperience,
            AvailableForWork = request.AvailableForWork,
            PortfolioUrl = NormalizeNullable(request.PortfolioUrl),
            LinkedInUrl = NormalizeNullable(request.LinkedInUrl),
            GitHubUrl = NormalizeNullable(request.GitHubUrl),
            Certificates = request.Certificates.Select(x =>
                new ExpertProfileReviewCertificateItem
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

    private static ExperienceVerificationSnapshot BuildExperienceVerification(
        CreateExpertProfileRequest request,
        List<CertificateVerificationResult> certificateVerificationResults
    )
    {
        var claimedYears = Math.Clamp(request.YearsOfExperience, 0, 50);

        var proofUrlCount = CountProvidedProofUrls(request);
        var hasEvidenceUrl = proofUrlCount >= 2;

        var hasVerifiedCertificate = certificateVerificationResults.Any(x =>
            x.VerificationStatus == "VERIFIED"
        );

        var hasNeedsEvidenceCertificate = certificateVerificationResults.Any(x =>
    x.VerificationStatus == "NEEDS_EVIDENCE"
);

        var hasSuspiciousOrInvalidCertificate = certificateVerificationResults.Any(x =>
            x.VerificationStatus is "SUSPICIOUS" or "INVALID"
        );

        var hasAnyCertificate = certificateVerificationResults.Count > 0;

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
        else if (hasNeedsEvidenceCertificate)
        {
            confidence += 20m;
        }
        else if (hasAnyCertificate)
        {
            confidence += 5m;
        }

        if (!string.IsNullOrWhiteSpace(request.Bio)
            && request.Bio.Trim().Length >= 120)
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

        var status = "NEEDS_EVIDENCE";

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
        var claimedYears = Math.Clamp(claimedYearsOfExperience, 0, 50);
        var verifiedYears = Math.Clamp(
            experienceVerification.VerifiedYearsOfExperience,
            0,
            50
        );

        var gap = claimedYears - verifiedYears;
        var confidence = experienceVerification.ExperienceConfidenceScore;
        var experienceStatus =
            experienceVerification.ExperienceVerificationStatus;

        if (string.Equals(
                experienceStatus,
                "SUSPICIOUS",
                StringComparison.OrdinalIgnoreCase
            ))
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

        if (normalizedAiStatus == "NEEDS_CORRECTION"
            && claimedYears <= 2
            && verifiedYears >= claimedYears
            && confidence >= 85m
            && string.Equals(
                experienceStatus,
                "VERIFIED",
                StringComparison.OrdinalIgnoreCase
            ))
        {
            return "APPROVED";
        }

        if (normalizedAiStatus == "APPROVED"
            && claimedYears >= 3
            && string.Equals(
                experienceStatus,
                "NEEDS_EVIDENCE",
                StringComparison.OrdinalIgnoreCase
            )
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
        var levelFromVerifiedYears = InferLevelFromVerifiedYears(
            verifiedYearsOfExperience
        );

        if (!string.Equals(
                finalReviewStatus,
                "APPROVED",
                StringComparison.OrdinalIgnoreCase
            ))
        {
            return levelFromVerifiedYears;
        }

        return CapLevelByVerifiedYears(
            normalizedAiLevel,
            verifiedYearsOfExperience
        );
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
            && GetProfileLevelRank(normalizedAiLevel)
            > GetProfileLevelRank("JUNIOR"))
        {
            return "JUNIOR";
        }

        if (verifiedYears < 5
            && GetProfileLevelRank(normalizedAiLevel)
            > GetProfileLevelRank("MID_LEVEL"))
        {
            return "MID_LEVEL";
        }

        if (verifiedYears < 7
            && GetProfileLevelRank(normalizedAiLevel)
            > GetProfileLevelRank("SENIOR"))
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
        return "NEEDS_CORRECTION";
    }

    var normalized = status.Trim()
        .ToUpper()
        .Replace("-", "_")
        .Replace(" ", "_");

    return normalized switch
    {
        "APPROVED" => "APPROVED",
        "NEEDS_CORRECTION" => "NEEDS_CORRECTION",
        _ => "NEEDS_CORRECTION"
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

        if (!string.Equals(
                NormalizeReviewStatus(aiReviewStatus),
                finalReviewStatus,
                StringComparison.OrdinalIgnoreCase
            ))
        {
            notes.Add(
                $"Backend verification changed profile review status from {aiReviewStatus} to {finalReviewStatus} because backend evidence verification result is stronger than the AI review result."
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

            var needsEvidenceCount = certificateVerificationResults.Count(x =>
    x.VerificationStatus == "NEEDS_EVIDENCE"
);

            var suspiciousCount = certificateVerificationResults.Count(x =>
                x.VerificationStatus == "SUSPICIOUS"
            );

            var invalidCount = certificateVerificationResults.Count(x =>
                x.VerificationStatus == "INVALID"
            );

            notes.Add(
              $"Certificate verification summary: {verifiedCount} verified, {needsEvidenceCount} needs evidence, {suspiciousCount} suspicious, {invalidCount} invalid."
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
        return request.Certificates.Select(certificate =>
        {
            var verificationResult = verificationResults.FirstOrDefault(result =>
                NormalizeUrl(result.CertificateUrl)
                == NormalizeUrl(certificate.CertificateUrl)
            );

            return new ExpertCertificate
            {
                CertificateName = certificate.CertificateName.Trim(),
                CertificateIssuer = certificate.CertificateIssuer.Trim(),
                CertificateUrl = certificate.CertificateUrl.Trim(),
                IssuedAt = certificate.IssuedAt,
                CreatedAt = DateTime.UtcNow,
                VerificationStatus =
                    verificationResult?.VerificationStatus ?? "NEEDS_EVIDENCE",
                VerificationScore = verificationResult?.VerificationScore ?? 0,
                VerificationNote = verificationResult?.VerificationNote,
                DetectedIssuer = verificationResult?.DetectedIssuer,
                DetectedCertificateName =
                    verificationResult?.DetectedCertificateName,
                CheckedAt = verificationResult?.CheckedAt
            };
        }).ToList();
    }

    private static List<ExpertCertificateResponse> BuildProposedCertificateResponses(
        CreateExpertProfileRequest request,
        List<CertificateVerificationResult> verificationResults
    )
    {
        return request.Certificates.Select(certificate =>
        {
            var verificationResult = verificationResults.FirstOrDefault(result =>
                NormalizeUrl(result.CertificateUrl)
                == NormalizeUrl(certificate.CertificateUrl)
            );

            return new ExpertCertificateResponse
            {
                ExpertCertificateId = 0,
                CertificateName = certificate.CertificateName.Trim(),
                CertificateIssuer = certificate.CertificateIssuer.Trim(),
                CertificateUrl = certificate.CertificateUrl.Trim(),
                IssuedAt = certificate.IssuedAt,
                CreatedAt = DateTime.UtcNow,
                VerificationStatus =
                    verificationResult?.VerificationStatus ?? "NEEDS_EVIDENCE",
                VerificationScore = verificationResult?.VerificationScore ?? 0,
                VerificationNote = verificationResult?.VerificationNote,
                DetectedIssuer = verificationResult?.DetectedIssuer,
                DetectedCertificateName =
                    verificationResult?.DetectedCertificateName,
                CheckedAt = verificationResult?.CheckedAt
            };
        }).ToList();
    }

    private static CreateExpertProfileRequest BuildReviewRequestFromVerificationUpdate(
        ExpertProfile expertProfile,
        UpdateExpertVerificationProfileRequest request
    )
    {
        return new CreateExpertProfileRequest
        {
            AvatarUrl = expertProfile.User.AvatarUrl,
            ProfessionalTitle = expertProfile.ProfessionalTitle,
            Bio = expertProfile.Bio,
            Skills = request.Skills,
            YearsOfExperience = request.YearsOfExperience,
            AvailableForWork = expertProfile.AvailableForWork,
            PortfolioUrl = request.PortfolioUrl,
            LinkedInUrl = request.LinkedInUrl,
            GitHubUrl = request.GitHubUrl,
            Certificates = request.Certificates
        };
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

    private static void ApplyProfileReviewResultAndUserStatus(
        ExpertProfile expertProfile,
        User user,
        string reviewStatus,
        DateTime now
    )
    {
        if (reviewStatus == "APPROVED")
        {
            expertProfile.ProfileReviewSubmissionCount = 0;
            expertProfile.ProfileReviewLockedUntil = null;
            user.Status = "ACTIVE";
            user.UpdatedAt = now;
            return;
        }

        if (IsFailedReviewStatus(reviewStatus))
        {
            expertProfile.ProfileReviewSubmissionCount += 1;
            expertProfile.ProfileReviewLockedUntil = null;
        }

        user.Status = reviewStatus switch
        {
            "LOCKED" => "EXPERT_PROFILE_LOCKED",
            "NEEDS_CORRECTION" => "PENDING_PROFILE",            _ => "PENDING_PROFILE"
        };

        user.UpdatedAt = now;
    }

    private static int GetInitialProfileReviewSubmissionCount(
        string reviewStatus
    )
    {
        return IsFailedReviewStatus(reviewStatus) ? 0 : 0;
    }

    private static bool IsFailedReviewStatus(string reviewStatus)
    {
        return reviewStatus == "NEEDS_CORRECTION";
    }

    private static bool ShouldLockBeforeNextExpertReviewAttempt(
        ExpertProfile expertProfile
    )
    {
        return IsFailedReviewStatus(expertProfile.ProfileReviewStatus)
            && expertProfile.ProfileReviewSubmissionCount >=
                MaxExpertProfileReviewSubmissions;
    }

    private static bool IsProfileReviewLocked(
        ExpertProfile expertProfile,
        DateTime now
    )
    {
        return string.Equals(
                expertProfile.ProfileReviewStatus,
                "LOCKED",
                StringComparison.OrdinalIgnoreCase
            )
            && expertProfile.ProfileReviewLockedUntil.HasValue
            && expertProfile.ProfileReviewLockedUntil.Value > now;
    }

    private static void ResetExpiredProfileReviewLockIfNeeded(
        ExpertProfile expertProfile,
        User user,
        DateTime now
    )
    {
        if (!string.Equals(
                expertProfile.ProfileReviewStatus,
                "LOCKED",
                StringComparison.OrdinalIgnoreCase
            ))
        {
            return;
        }

        if (!expertProfile.ProfileReviewLockedUntil.HasValue
            || expertProfile.ProfileReviewLockedUntil.Value > now)
        {
            return;
        }

        expertProfile.ProfileReviewStatus = "NEEDS_CORRECTION";
        expertProfile.ProfileReviewNote =
            "Expert profile review lock expired. You can resubmit the profile.";
        expertProfile.MissingInformation =
            "Please update your profile with valid proof URLs and certificate evidence.";
        expertProfile.ProfileReviewSubmissionCount = 0;
        expertProfile.ProfileReviewLockedUntil = null;
        expertProfile.UpdatedAt = now;

        user.Status = "PENDING_PROFILE";
        user.UpdatedAt = now;
    }

    private static void LockExpertProfileReview(
        ExpertProfile expertProfile,
        User user,
        DateTime now
    )
    {
        var lockedUntil = now.Add(ExpertProfileReviewLockDuration);

        expertProfile.ProfileReviewStatus = "LOCKED";
        expertProfile.ProfileReviewNote =
            $"Expert profile review is locked until {lockedUntil:O} because too many failed submissions were made.";
        expertProfile.MissingInformation =
            "Please wait until the lock expires before resubmitting your expert profile.";
        expertProfile.ProfileReviewLockedUntil = lockedUntil;
        expertProfile.UpdatedAt = now;

        user.Status = "EXPERT_PROFILE_LOCKED";
        user.UpdatedAt = now;
    }

    private static bool CanResubmit(string userStatus, string profileReviewStatus)
    {
        var normalizedUserStatus = userStatus.Trim().ToUpperInvariant();
        var normalizedProfileStatus = profileReviewStatus.Trim().ToUpperInvariant();

        return normalizedUserStatus == "PENDING_PROFILE"
            && normalizedProfileStatus == "NEEDS_CORRECTION";
    }

    private static void EnsureActiveExpertCanUpdate(User user)
    {
        if (!string.Equals(user.Role, "EXPERT", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Only EXPERT users can update an expert profile."
            );
        }

        if (string.Equals(
                user.Status,
                "SUSPENDED",
                StringComparison.OrdinalIgnoreCase
            )
            || string.Equals(
                user.Status,
                "BANNED",
                StringComparison.OrdinalIgnoreCase
            ))
        {
            throw new InvalidOperationException(
                "Your account is not allowed to update expert profile."
            );
        }

        if (!string.Equals(user.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Only ACTIVE experts can update profile. Use resubmit API while profile is pending."
            );
        }
    }

    private static void ValidateBasicUpdateRequest(
        UpdateExpertBasicProfileRequest request
    )
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new InvalidOperationException("Full name is required.");
        }

        var fullName = request.FullName.Trim();

        if (fullName.Length < 2 || fullName.Length > 255)
        {
            throw new InvalidOperationException("Full name length is invalid.");
        }

        if (string.IsNullOrWhiteSpace(request.ProfessionalTitle))
        {
            throw new InvalidOperationException("Professional title is required.");
        }

        if (request.ProfessionalTitle.Trim().Length > 255)
        {
            throw new InvalidOperationException(
                "Professional title must be at most 255 characters."
            );
        }

        if (string.IsNullOrWhiteSpace(request.Bio))
        {
            throw new InvalidOperationException("Bio is required.");
        }

        if (request.Bio.Trim().Length < 50)
        {
            throw new InvalidOperationException(
                "Bio must be at least 50 characters."
            );
        }

        if (!string.IsNullOrWhiteSpace(request.AvatarUrl)
            && !IsValidUrl(request.AvatarUrl))
        {
            throw new InvalidOperationException("Avatar URL is invalid.");
        }
    }

    private static void ValidateVerificationUpdateRequest(
        UpdateExpertVerificationProfileRequest request
    )
    {
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

        var proofUrlCount = 0;

        if (!string.IsNullOrWhiteSpace(request.PortfolioUrl))
        {
            proofUrlCount++;
        }

        if (!string.IsNullOrWhiteSpace(request.LinkedInUrl))
        {
            proofUrlCount++;
        }

        if (!string.IsNullOrWhiteSpace(request.GitHubUrl))
        {
            proofUrlCount++;
        }

        if (proofUrlCount < 2)
        {
            throw new InvalidOperationException(
                "At least 2 of Portfolio URL, LinkedIn URL, and GitHub URL are required."
            );
        }

        if (!string.IsNullOrWhiteSpace(request.PortfolioUrl)
            && !IsValidUrl(request.PortfolioUrl))
        {
            throw new InvalidOperationException("Portfolio URL is invalid.");
        }

        if (!string.IsNullOrWhiteSpace(request.LinkedInUrl)
            && !IsValidUrl(request.LinkedInUrl))
        {
            throw new InvalidOperationException("LinkedIn URL is invalid.");
        }

        if (!string.IsNullOrWhiteSpace(request.GitHubUrl)
            && !IsValidUrl(request.GitHubUrl))
        {
            throw new InvalidOperationException("GitHub URL is invalid.");
        }

        if (request.Certificates.Count == 0)
        {
            throw new InvalidOperationException(
                "At least one certificate is required."
            );
        }

        if (request.Certificates.Count > 10)
        {
            throw new InvalidOperationException(
                "Maximum 10 certificates are allowed."
            );
        }

        var duplicateCertificateUrls = request.Certificates
            .Where(x => !string.IsNullOrWhiteSpace(x.CertificateUrl))
            .GroupBy(x => x.CertificateUrl.Trim().ToLower())
            .Any(g => g.Count() > 1);

        if (duplicateCertificateUrls)
        {
            throw new InvalidOperationException(
                "Duplicate certificate URLs are not allowed."
            );
        }

        foreach (var certificate in request.Certificates)
        {
            if (string.IsNullOrWhiteSpace(certificate.CertificateName))
            {
                throw new InvalidOperationException(
                    "Certificate name is required."
                );
            }

            if (string.IsNullOrWhiteSpace(certificate.CertificateIssuer))
            {
                throw new InvalidOperationException(
                    "Certificate issuer is required."
                );
            }

            if (string.IsNullOrWhiteSpace(certificate.CertificateUrl))
            {
                throw new InvalidOperationException(
                    "Certificate URL is required."
                );
            }

            if (!IsValidUrl(certificate.CertificateUrl))
            {
                throw new InvalidOperationException(
                    "Certificate URL is invalid."
                );
            }
        }
    }

    private static void ValidateCreateOrResubmitRequest(
        CreateExpertProfileRequest request
    )
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
            throw new InvalidOperationException(
                "Bio must be at least 50 characters."
            );
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

        if (CountProvidedProofUrls(request) < 2)
        {
            throw new InvalidOperationException(
                "At least 2 of Portfolio URL, LinkedIn URL, and GitHub URL are required."
            );
        }

        if (request.Certificates.Count == 0)
        {
            throw new InvalidOperationException(
                "At least one certificate is required."
            );
        }

        if (request.Certificates.Count > 10)
        {
            throw new InvalidOperationException(
                "Maximum 10 certificates are allowed."
            );
        }

        var duplicateCertificateUrls = request.Certificates
            .Where(x => !string.IsNullOrWhiteSpace(x.CertificateUrl))
            .GroupBy(x => x.CertificateUrl.Trim().ToLower())
            .Any(g => g.Count() > 1);

        if (duplicateCertificateUrls)
        {
            throw new InvalidOperationException(
                "Duplicate certificate URLs are not allowed."
            );
        }

        foreach (var certificate in request.Certificates)
        {
            if (string.IsNullOrWhiteSpace(certificate.CertificateName))
            {
                throw new InvalidOperationException(
                    "Certificate name is required."
                );
            }

            if (string.IsNullOrWhiteSpace(certificate.CertificateIssuer))
            {
                throw new InvalidOperationException(
                    "Certificate issuer is required."
                );
            }

            if (string.IsNullOrWhiteSpace(certificate.CertificateUrl))
            {
                throw new InvalidOperationException(
                    "Certificate URL is required."
                );
            }

            if (!IsValidUrl(certificate.CertificateUrl))
            {
                throw new InvalidOperationException(
                    "Certificate URL is invalid."
                );
            }
        }

        if (!string.IsNullOrWhiteSpace(request.AvatarUrl)
            && !IsValidUrl(request.AvatarUrl))
        {
            throw new InvalidOperationException("Avatar URL is invalid.");
        }

        if (!string.IsNullOrWhiteSpace(request.PortfolioUrl)
            && !IsValidUrl(request.PortfolioUrl))
        {
            throw new InvalidOperationException("Portfolio URL is invalid.");
        }

        if (!string.IsNullOrWhiteSpace(request.LinkedInUrl)
            && !IsValidUrl(request.LinkedInUrl))
        {
            throw new InvalidOperationException("LinkedIn URL is invalid.");
        }

        if (!string.IsNullOrWhiteSpace(request.GitHubUrl)
            && !IsValidUrl(request.GitHubUrl))
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

    private static bool IsValidUrl(string value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp
                || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static string? NormalizeNullable(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
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
            VerifiedYearsOfExperience =
                expertProfile.VerifiedYearsOfExperience,
            ExperienceConfidenceScore =
                expertProfile.ExperienceConfidenceScore,
            ExperienceVerificationStatus =
                expertProfile.ExperienceVerificationStatus,
            ExperienceVerificationNote =
                expertProfile.ExperienceVerificationNote,
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
            ProfileReviewSubmissionCount =
                expertProfile.ProfileReviewSubmissionCount,
            ProfileReviewLockedUntil = expertProfile.ProfileReviewLockedUntil,
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

        public string ExperienceVerificationStatus { get; set; } = "NEEDS_EVIDENCE";

        public string? ExperienceVerificationNote { get; set; }
    }

    private class ReviewSnapshot
    {
        public string ProfileReviewStatus { get; set; } = "NEEDS_CORRECTION";

        public string? ProfileReviewNote { get; set; }

        public string? MissingInformation { get; set; }

        public decimal ProfileScore { get; set; }

        public string Level { get; set; } = "FRESHER";

        public string ExpertCategory { get; set; } = "OTHER";

        public int VerifiedYearsOfExperience { get; set; }

        public decimal ExperienceConfidenceScore { get; set; }

        public string ExperienceVerificationStatus { get; set; } = "NEEDS_EVIDENCE";

        public string? ExperienceVerificationNote { get; set; }

        public List<CertificateVerificationResult> CertificateVerificationResults { get; set; } = new();
    }
}