namespace AITasker.Application.DTOs.Responses;

public class ExpertSkillResponse
{
    public int ExpertSkillId { get; set; }

    public int ExpertProfileId { get; set; }

    public int SkillId { get; set; }

    public string SkillName { get; set; } = string.Empty;

    public string? Category { get; set; }

    public string SkillLevel { get; set; } = string.Empty;

    public int YearsOfExperience { get; set; }

    public bool IsPrimary { get; set; }

    public DateTime CreatedAt { get; set; }
}