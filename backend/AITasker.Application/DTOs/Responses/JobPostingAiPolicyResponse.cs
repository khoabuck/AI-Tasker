namespace AITasker.Application.DTOs.Responses;

public class JobPostingAiPolicyResponse
{
    public int JobPostingAiPolicyId { get; set; }

    public int InitialFreeJobPostCredits { get; set; }

    public int InitialFreeAiGenerationCredits { get; set; }

    public int MaxDraftJobsPerClient { get; set; }

    public int MaxSkillsPerJob { get; set; }

    public int MaxSuggestedSkills { get; set; }

    public int MinimumSkillRelevanceScore { get; set; }

    public int MaxRecommendationResults { get; set; }

    public int MinimumRecommendationMatchScore { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdatedByAdminEmail { get; set; }

    public string? UpdatedByAdminFullName { get; set; }
}
