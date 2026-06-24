namespace AITasker.Application.DTOs.Requests;

public class AdminLockUserRequest
{
    public int DurationMinutes { get; set; }

    public string Reason { get; set; } = string.Empty;
}
