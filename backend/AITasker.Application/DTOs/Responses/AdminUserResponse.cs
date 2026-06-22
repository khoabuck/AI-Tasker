namespace AITasker.Application.DTOs.Responses;

public class AdminUserResponse
{
    public int UserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string? Role { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? StatusBeforeSuspension { get; set; }

    public string AuthProvider { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }

    public int LockoutCount { get; set; }

    public DateTime? LockoutEnd { get; set; }

    public DateTime? LastLockedAt { get; set; }

    public string? LockReason { get; set; }

    public DateTime? BannedAt { get; set; }

    public string? BanReason { get; set; }

    public long LockoutRemainingSeconds { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}