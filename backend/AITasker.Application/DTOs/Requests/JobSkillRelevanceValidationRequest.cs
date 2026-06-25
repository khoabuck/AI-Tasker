namespace AITasker.Application.DTOs.Requests;

public class JobSkillRelevanceValidationRequest
{
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string? AiGeneratedDescription { get; set; }

    public string ProjectType { get; set; } = string.Empty;

    public string Complexity { get; set; } = "UNKNOWN";

    public string ExpectedDeliverables { get; set; } = string.Empty;

    public List<string> SelectedSkillNames { get; set; } = new();

    public List<string> AvailableSkillNames { get; set; } = new();
}
