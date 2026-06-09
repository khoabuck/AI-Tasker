namespace AITasker.Domain.Entities;

public class JobSkill
{
    public int JobSkillId { get; set; }

    public int JobId { get; set; }

    public int SkillId { get; set; }

    // null / BEGINNER / INTERMEDIATE / ADVANCED
    public string? SkillLevelRequired { get; set; }

    public bool IsRequired { get; set; } = true;

    public JobPosting JobPosting { get; set; } = null!;

    public Skill Skill { get; set; } = null!;
}
