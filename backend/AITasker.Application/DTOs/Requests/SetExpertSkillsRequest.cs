namespace AITasker.Application.DTOs.Requests;

public class SetExpertSkillsRequest
{
    public List<SetExpertSkillItem> Skills { get; set; } = new();
}

public class SetExpertSkillItem
{
    public int SkillId { get; set; }
    public string SkillLevel { get; set; } = string.Empty;
    public int? YearsOfExperience { get; set; }
}
