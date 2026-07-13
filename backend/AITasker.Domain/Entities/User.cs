namespace AITasker.Domain.Entities;

public class User
{
    public int UserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string? PasswordHash { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Role { get; set; }

    public string AuthProvider { get; set; } = "LOCAL";

    public string? GoogleId { get; set; }

    public string? AvatarUrl { get; set; }

    public string Status { get; set; } = "PENDING_ROLE";

    public string? StatusBeforeSuspension { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int FailedLoginAttempts { get; set; } = 0;

    public DateTime? LoginBlockedUntil { get; set; }

    public int LockoutCount { get; set; } = 0;

    public DateTime? LockoutEnd { get; set; }

    public DateTime? LastLockedAt { get; set; }

    public string? LockReason { get; set; }

    public DateTime? BannedAt { get; set; }

    public string? BanReason { get; set; }
}
