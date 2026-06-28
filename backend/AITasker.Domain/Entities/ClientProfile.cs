namespace AITasker.Domain.Entities;

public class ClientProfile
{
    public int ClientProfileId { get; set; }

    public int UserId { get; set; }

    public string ClientType { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string? Address { get; set; }

    public decimal PlatformFeeRate { get; set; }

    public int FreeJobPostCredits { get; set; } = 1;

    public int PaidJobPostCredits { get; set; } = 0;

    public int FreeAiGenerationCredits { get; set; } = 3;

    public int PaidAiGenerationCredits { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;

    public BusinessProfile? BusinessProfile { get; set; }
}