namespace AITasker.Application.DTOs.Responses;

public class JobSkillRelevanceValidationResult
{
    public bool IsRelevant { get; set; }

    public int RelevanceScore { get; set; }

    public List<string> RelevantSkills { get; set; } = new();

    public List<string> IrrelevantSkills { get; set; } = new();

    public List<string> MissingCoreSkills { get; set; } = new();

    public List<string> SuggestedSkillNames { get; set; } = new();

    public string Reason { get; set; } = string.Empty;
}
