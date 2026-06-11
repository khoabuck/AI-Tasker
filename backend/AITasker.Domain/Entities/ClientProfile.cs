namespace AITasker.Domain.Entities;

public class ClientProfile
{
    public int ClientProfileId { get; set; }

    public int UserId { get; set; }

    public string ClientType { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string? Address { get; set; }

    public string? AiNeeds { get; set; }

    public string? MainProblems { get; set; }

    public decimal? ExpectedBudgetMin { get; set; }

    public decimal? ExpectedBudgetMax { get; set; }

    public decimal PlatformFeeRate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;

    public BusinessProfile? BusinessProfile { get; set; }
}