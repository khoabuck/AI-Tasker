using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);

    Task<AuthResponse> LoginAsync(LoginRequest request);

    Task<AuthResponse> GoogleLoginAsync(
        string email,
        string fullName,
        string googleId,
        string? avatarUrl
    );

    Task<UserResponse?> GetCurrentUserAsync(int userId);
}