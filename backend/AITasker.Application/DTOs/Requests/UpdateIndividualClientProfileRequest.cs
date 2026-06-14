namespace AITasker.Application.DTOs.Requests;

public class UpdateIndividualClientProfileRequest
{
    public string? FullName { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public string? AiNeeds { get; set; }

    public string? MainProblems { get; set; }

    public decimal? ExpectedBudgetMin { get; set; }

    public decimal? ExpectedBudgetMax { get; set; }

    public string? AvatarUrl { get; set; }
}