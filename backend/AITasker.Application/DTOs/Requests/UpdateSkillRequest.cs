namespace AITasker.Application.DTOs.Requests;

public class UpdateSkillRequest
{
    public string SkillName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public bool IsActive { get; set; } = true;
}
