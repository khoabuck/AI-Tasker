namespace AITasker.Domain.Entities;

public class LoginSecurityPolicy
{
    public int LoginSecurityPolicyId { get; set; }

    public int MaxFailedLoginAttempts { get; set; } = 5;

    public int LockoutDurationMinutes { get; set; } = 15;

    public bool IsEnabled { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public User? UpdatedByAdmin { get; set; }
}
