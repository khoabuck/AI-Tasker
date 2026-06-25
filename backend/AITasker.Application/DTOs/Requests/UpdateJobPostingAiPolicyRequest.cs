namespace AITasker.Application.DTOs.Requests;

public class UpdateJobPostingAiPolicyRequest
{
    public int InitialFreeJobPostCredits { get; set; }

    public int InitialFreeAiGenerationCredits { get; set; }

    public int MaxDraftJobsPerClient { get; set; }

    public int MaxSkillsPerJob { get; set; }

    public int MaxSuggestedSkills { get; set; }

    public int MinimumSkillRelevanceScore { get; set; }

    public int MaxRecommendationResults { get; set; }

    public int MinimumRecommendationMatchScore { get; set; }

    public string? Reason { get; set; }
}
