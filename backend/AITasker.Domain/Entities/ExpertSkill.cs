namespace AITasker.Domain.Entities;

public class ExpertSkill
{
    public int ExpertSkillId { get; set; }

    public int ExpertProfileId { get; set; }

    public int SkillId { get; set; }

    public string SkillLevel { get; set; } = "INTERMEDIATE";

    public int YearsOfExperience { get; set; }

    public bool IsPrimary { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ExpertProfile? ExpertProfile { get; set; }

    public Skill? Skill { get; set; }
}