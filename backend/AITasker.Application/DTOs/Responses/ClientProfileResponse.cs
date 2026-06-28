namespace AITasker.Application.DTOs.Responses;

public class ClientProfileResponse
{
    public int ClientProfileId { get; set; }

    public int UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public string ClientType { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string? Address { get; set; }

    public decimal PlatformFeeRate { get; set; }

    public int FreeJobPostCredits { get; set; }

    public int PaidJobPostCredits { get; set; }

    public int FreeAiGenerationCredits { get; set; }

    public int PaidAiGenerationCredits { get; set; }

    public string UserStatus { get; set; } = string.Empty;

    public BusinessProfileResponse? BusinessProfile { get; set; }
}