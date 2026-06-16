namespace AITasker.Application.DTOs.Responses;

public class PromptExpertRecommendationResponse
{
    public string Prompt { get; set; } = string.Empty;

    public string SuggestedTitle { get; set; } = string.Empty;

    public string ImprovedDescription { get; set; } = string.Empty;

    public string AiGeneratedDescription { get; set; } = string.Empty;

    public string SuggestedProjectType { get; set; } = string.Empty;

    public string SuggestedComplexity { get; set; } = "UNKNOWN";

    public string ExpectedDeliverables { get; set; } = string.Empty;

    public List<int> SuggestedSkillIds { get; set; } = new();

    public List<JobAssistantSkillResponse> SuggestedSkills { get; set; } = new();

    public List<string> Warnings { get; set; } = new();

    public List<ExpertRecommendationResponse> RecommendedExperts { get; set; } = new();
}