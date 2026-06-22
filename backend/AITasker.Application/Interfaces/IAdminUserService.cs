using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IAdminUserService
{
    Task<List<AdminUserResponse>> GetUsersAsync(
        string? search,
        string? role,
        string? status
    );

    Task<AdminUserResponse?> GetUserByIdAsync(int userId);

    Task<AdminUserResponse?> LockUserAsync(
        int adminId,
        int userId,
        AdminLockUserRequest request
    );

    Task<AdminUserResponse?> UnlockUserAsync(
        int adminId,
        int userId,
        AdminUnlockUserRequest request
    );

    Task<AdminUserResponse?> BanUserAsync(
        int adminId,
        int userId,
        AdminBanUserRequest request
    );
}
