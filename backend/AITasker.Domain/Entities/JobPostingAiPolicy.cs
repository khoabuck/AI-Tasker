namespace AITasker.Domain.Entities;

public class JobPostingAiPolicy
{
    public int JobPostingAiPolicyId { get; set; }

    public int InitialFreeJobPostCredits { get; set; } = 1;

    public int InitialFreeAiGenerationCredits { get; set; } = 3;

    public int MaxDraftJobsPerClient { get; set; } = 10;

    public int MaxSkillsPerJob { get; set; } = 8;

    public int MaxSuggestedSkills { get; set; } = 8;

    public int MinimumSkillRelevanceScore { get; set; } = 60;

    public int MaxRecommendationResults { get; set; } = 50;

    public int MinimumRecommendationMatchScore { get; set; } = 1;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public User? UpdatedByAdmin { get; set; }
}
