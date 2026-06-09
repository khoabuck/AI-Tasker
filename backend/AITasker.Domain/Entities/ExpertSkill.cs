namespace AITasker.Domain.Entities;

public class ExpertSkill
{
    public int ExpertSkillId { get; set; }

    public int ExpertProfileId { get; set; }

    public int SkillId { get; set; }

    // BEGINNER / INTERMEDIATE / ADVANCED
    public string SkillLevel { get; set; } = "BEGINNER";

    public int? YearsOfExperience { get; set; }

    public ExpertProfile ExpertProfile { get; set; } = null!;

    public Skill Skill { get; set; } = null!;
}
