namespace AITasker.Application.DTOs.Requests;

public class UpdateLoginSecurityPolicyRequest
{
    public int MaxFailedLoginAttempts { get; set; }

    public int LockoutDurationMinutes { get; set; }

    public bool IsEnabled { get; set; }

    public string? Reason { get; set; }
}
