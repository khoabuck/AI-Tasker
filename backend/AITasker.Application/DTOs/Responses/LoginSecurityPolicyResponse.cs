namespace AITasker.Application.DTOs.Responses;

public class LoginSecurityPolicyResponse
{
    public int LoginSecurityPolicyId { get; set; }

    public int MaxFailedLoginAttempts { get; set; }

    public int LockoutDurationMinutes { get; set; }

    public bool IsEnabled { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdatedByAdminEmail { get; set; }

    public string? UpdatedByAdminFullName { get; set; }
}
