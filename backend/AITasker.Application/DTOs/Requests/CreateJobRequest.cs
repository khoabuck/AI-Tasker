namespace AITasker.Application.DTOs.Requests;

public class CreateJobRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? AIgeneratedDescription { get; set; }
    public decimal BudgetMin { get; set; }
    public decimal BudgetMax { get; set; }
    public List<CreateJobSkillItem> Skills { get; set; } = new();
}

public class CreateJobSkillItem
{
    public int SkillId { get; set; }
    public string? SkillLevelRequired { get; set; }
    public bool IsRequired { get; set; } = true;
}
