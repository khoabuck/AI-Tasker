namespace AITasker.Domain.Entities;

public class JobSkill
{
    public int JobSkillId { get; set; }

    public int JobPostingId { get; set; }

    public int SkillId { get; set; }

    public string? SkillLevelRequired { get; set; }

    public bool IsRequired { get; set; } = true;

    public JobPosting? JobPosting { get; set; }

    public Skill? Skill { get; set; }
}