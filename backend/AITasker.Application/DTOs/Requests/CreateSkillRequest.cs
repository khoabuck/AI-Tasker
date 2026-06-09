namespace AITasker.Application.DTOs.Requests;

public class CreateSkillRequest
{
    public string SkillName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
}
