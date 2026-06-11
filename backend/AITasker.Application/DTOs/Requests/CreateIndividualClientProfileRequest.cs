namespace AITasker.Application.DTOs.Requests;

public class CreateIndividualClientProfileRequest
{
    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public string? AiNeeds { get; set; }

    public string? MainProblems { get; set; }

    public decimal? ExpectedBudgetMin { get; set; }

    public decimal? ExpectedBudgetMax { get; set; }
}