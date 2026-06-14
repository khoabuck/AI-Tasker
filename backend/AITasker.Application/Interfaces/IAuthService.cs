using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IAuthService
{
    Task<MessageResponse> RegisterAsync(RegisterRequest request);

    Task<AuthResponse> LoginAsync(LoginRequest request);

    Task<AuthResponse> GoogleLoginAsync(
        string email,
        string fullName,
        string googleId,
        string? avatarUrl
    );

    Task<MessageResponse> VerifyEmailAsync(string token);

    Task<MessageResponse> ResendVerificationEmailAsync(
        ResendVerificationEmailRequest request
    );

    Task<MessageResponse> ForgotPasswordAsync(ForgotPasswordRequest request);

    Task<MessageResponse> ResetPasswordAsync(ResetPasswordRequest request);

    Task<AuthResponse> SelectRoleAsync(int userId, SelectRoleRequest request);

    Task<UserResponse?> GetCurrentUserAsync(int userId);
}