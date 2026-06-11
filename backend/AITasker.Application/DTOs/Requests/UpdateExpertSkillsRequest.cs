namespace AITasker.Application.DTOs.Requests;

public class UpdateExpertSkillsRequest
{
    public List<ExpertSkillItemRequest> Skills { get; set; } = new();
}

public class ExpertSkillItemRequest
{
    public int SkillId { get; set; }

    public string SkillLevel { get; set; } = "INTERMEDIATE";

    public int YearsOfExperience { get; set; }

    public bool IsPrimary { get; set; }
}