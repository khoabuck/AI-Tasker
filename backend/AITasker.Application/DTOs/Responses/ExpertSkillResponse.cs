namespace AITasker.Application.DTOs.Responses;

public class ExpertSkillResponse
{
    public int ExpertSkillId { get; set; }
    public int SkillId { get; set; }
    public string SkillName { get; set; } = string.Empty;
    public string SkillLevel { get; set; } = string.Empty;
    public int? YearsOfExperience { get; set; }
}
