namespace AITasker.Application.DTOs.Responses;

public class UserResponse
{
    public int UserId { get; set; }

    public string Email { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string? Role { get; set; }

    public string Status { get; set; } = string.Empty;

    public string AuthProvider { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }
}