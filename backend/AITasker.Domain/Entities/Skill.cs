namespace AITasker.Domain.Entities;

public class Skill
{
    public int SkillId { get; set; }

    public string SkillName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Category { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
