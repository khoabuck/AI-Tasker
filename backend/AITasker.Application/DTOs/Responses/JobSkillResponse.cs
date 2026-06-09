namespace AITasker.Application.DTOs.Responses;

public class JobSkillResponse
{
    public int SkillId { get; set; }
    public string SkillName { get; set; } = string.Empty;
    public string? SkillLevelRequired { get; set; }
    public bool IsRequired { get; set; }
}
