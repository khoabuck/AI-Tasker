namespace AITasker.Application.DTOs.Responses;

public class ExpertSkillAiAnalysisResult
{
    public List<ExpertSkillAiItemResult> Skills { get; set; } = new();

    public List<string> Warnings { get; set; } = new();
}

public class ExpertSkillAiItemResult
{
    public string SkillName { get; set; } = string.Empty;

    public string SkillLevel { get; set; } = "INTERMEDIATE";

    public int YearsOfExperience { get; set; }

    public bool IsPrimary { get; set; }

    public string? Reason { get; set; }
}