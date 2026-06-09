namespace AITasker.Application.DTOs.Requests;

public class JobFilterRequest
{
    public string? Status { get; set; }
    public int? SkillId { get; set; }
    public decimal? BudgetMin { get; set; }
    public decimal? BudgetMax { get; set; }
    public string? Complexity { get; set; }
    public string? ProjectType { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
