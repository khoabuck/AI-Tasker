using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class AdminUserService : IAdminUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IAdminAuditLogService _adminAuditLogService;

    public AdminUserService(
        IUserRepository userRepository,
        IAdminAuditLogService adminAuditLogService)
    {
        _userRepository = userRepository;
        _adminAuditLogService = adminAuditLogService;
    }

    public async Task<List<AdminUserResponse>> GetUsersAsync(
        string? search,
        string? role,
        string? status)
    {
        await UnlockExpiredSuspendedUsersAsync();

        var users = await _userRepository.GetAdminUsersAsync(
            search,
            role,
            status
        );

        return users.Select(MapToAdminUserResponse).ToList();
    }

    public async Task<AdminUserResponse?> GetUserByIdAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);

        if (user == null)
        {
            return null;
        }

        var changed = await UnlockIfSuspensionExpiredAsync(user);

        if (changed)
        {
            await _userRepository.SaveChangesAsync();
        }

        return MapToAdminUserResponse(user);
    }

    public async Task<AdminUserResponse?> LockUserAsync(
        int adminId,
        int userId,
        AdminLockUserRequest request)
    {
        if (request.DurationMinutes <= 0)
        {
            throw new InvalidOperationException("Lock duration must be greater than 0 minute.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException("Lock reason is required.");
        }

        var user = await _userRepository.GetByIdAsync(userId);

        if (user == null)
        {
            return null;
        }

        if (user.Role == "ADMIN")
        {
            throw new InvalidOperationException("Cannot lock an admin account.");
        }

        if (user.Status == "BANNED")
        {
            throw new InvalidOperationException("Cannot lock a banned account.");
        }

        var oldValue = BuildUserAuditValue(user);
        var now = DateTime.UtcNow;

        if (user.Status != "SUSPENDED")
        {
            user.StatusBeforeSuspension = user.Status;
        }
        else if (string.IsNullOrWhiteSpace(user.StatusBeforeSuspension))
        {
            user.StatusBeforeSuspension = "ACTIVE";
        }

        user.Status = "SUSPENDED";
        user.LockoutCount += 1;
        user.LastLockedAt = now;
        user.LockoutEnd = now.AddMinutes(request.DurationMinutes);
        user.LockReason = request.Reason.Trim();
        user.UpdatedAt = now;

        var newValue = BuildUserAuditValue(user);

        await _userRepository.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "LOCK_USER",
            nameof(User),
            user.UserId,
            oldValue,
            newValue,
            request.Reason
        );

        return MapToAdminUserResponse(user);
    }

    public async Task<AdminUserResponse?> UnlockUserAsync(
        int adminId,
        int userId,
        AdminUnlockUserRequest request)
    {
        var user = await _userRepository.GetByIdAsync(userId);

        if (user == null)
        {
            return null;
        }

        if (user.Role == "ADMIN")
        {
            throw new InvalidOperationException("Cannot unlock an admin account with this API.");
        }

        if (user.Status == "BANNED")
        {
            throw new InvalidOperationException("Cannot unlock a banned account. Banned accounts are permanent.");
        }

        if (user.Status != "SUSPENDED")
        {
            throw new InvalidOperationException("Only suspended accounts can be unlocked.");
        }

        var oldValue = BuildUserAuditValue(user);
        var restoredStatus = string.IsNullOrWhiteSpace(user.StatusBeforeSuspension)
            ? "ACTIVE"
            : user.StatusBeforeSuspension;

        user.Status = restoredStatus;
        user.StatusBeforeSuspension = null;
        user.LockoutEnd = null;
        user.LockReason = null;
        user.UpdatedAt = DateTime.UtcNow;

        var newValue = BuildUserAuditValue(user);

        await _userRepository.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UNLOCK_USER",
            nameof(User),
            user.UserId,
            oldValue,
            newValue,
            request.Reason
        );

        return MapToAdminUserResponse(user);
    }

    public async Task<AdminUserResponse?> BanUserAsync(
        int adminId,
        int userId,
        AdminBanUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException("Ban reason is required.");
        }

        var user = await _userRepository.GetByIdAsync(userId);

        if (user == null)
        {
            return null;
        }

        if (user.Role == "ADMIN")
        {
            throw new InvalidOperationException("Cannot ban an admin account.");
        }

        var oldValue = BuildUserAuditValue(user);
        var now = DateTime.UtcNow;

        user.Status = "BANNED";
        user.StatusBeforeSuspension = null;
        user.BannedAt = now;
        user.BanReason = request.Reason.Trim();

        user.LockoutEnd = null;
        user.LockReason = null;

        user.UpdatedAt = now;

        var newValue = BuildUserAuditValue(user);

        await _userRepository.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "BAN_USER",
            nameof(User),
            user.UserId,
            oldValue,
            newValue,
            request.Reason
        );

        return MapToAdminUserResponse(user);
    }

    private async Task UnlockExpiredSuspendedUsersAsync()
    {
        var suspendedUsers = await _userRepository.GetExpiredSuspendedUsersAsync(
            DateTime.UtcNow
        );

        var hasChanged = false;

        foreach (var user in suspendedUsers)
        {
            if (await UnlockIfSuspensionExpiredAsync(user))
            {
                hasChanged = true;
            }
        }

        if (hasChanged)
        {
            await _userRepository.SaveChangesAsync();
        }
    }

    private async Task<bool> UnlockIfSuspensionExpiredAsync(User user)
    {
        if (user.Status != "SUSPENDED")
        {
            return false;
        }

        if (!user.LockoutEnd.HasValue)
        {
            return false;
        }

        if (user.LockoutEnd.Value > DateTime.UtcNow)
        {
            return false;
        }

        var oldValue = BuildUserAuditValue(user);
        var restoredStatus = string.IsNullOrWhiteSpace(user.StatusBeforeSuspension)
            ? "ACTIVE"
            : user.StatusBeforeSuspension;

        user.Status = restoredStatus;
        user.StatusBeforeSuspension = null;
        user.LockoutEnd = null;
        user.LockReason = null;
        user.UpdatedAt = DateTime.UtcNow;

        var newValue = BuildUserAuditValue(user);

        await _adminAuditLogService.LogAsync(
            adminId: null,
            action: "AUTO_UNLOCK_USER",
            entityName: nameof(User),
            entityId: user.UserId,
            oldValue: oldValue,
            newValue: newValue,
            reason: "Suspension duration expired."
        );

        return true;
    }

    private static AdminUserResponse MapToAdminUserResponse(User user)
    {
        return new AdminUserResponse
        {
            UserId = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            Status = user.Status,
            StatusBeforeSuspension = user.StatusBeforeSuspension,
            AuthProvider = user.AuthProvider,
            AvatarUrl = user.AvatarUrl,

            LockoutCount = user.LockoutCount,
            LockoutEnd = user.LockoutEnd,
            LastLockedAt = user.LastLockedAt,
            LockReason = user.LockReason,

            BannedAt = user.BannedAt,
            BanReason = user.BanReason,

            LockoutRemainingSeconds = CalculateLockoutRemainingSeconds(user),

            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    private static long CalculateLockoutRemainingSeconds(User user)
    {
        if (user.Status != "SUSPENDED")
        {
            return 0;
        }

        if (!user.LockoutEnd.HasValue)
        {
            return 0;
        }

        var remaining = user.LockoutEnd.Value - DateTime.UtcNow;

        if (remaining.TotalSeconds <= 0)
        {
            return 0;
        }

        return (long)remaining.TotalSeconds;
    }

    private static string BuildUserAuditValue(User user)
    {
        return string.Join("; ", new[]
        {
            $"UserId={user.UserId}",
            $"Email={user.Email}",
            $"Role={user.Role ?? "NULL"}",
            $"Status={user.Status}",
            $"StatusBeforeSuspension={user.StatusBeforeSuspension ?? "NULL"}",
            $"LockoutCount={user.LockoutCount}",
            $"LockoutEnd={FormatDateTime(user.LockoutEnd)}",
            $"LastLockedAt={FormatDateTime(user.LastLockedAt)}",
            $"LockReason={user.LockReason ?? "NULL"}",
            $"BannedAt={FormatDateTime(user.BannedAt)}",
            $"BanReason={user.BanReason ?? "NULL"}"
        });
    }

    private static string FormatDateTime(DateTime? value)
    {
        return value.HasValue
            ? value.Value.ToString("O")
            : "NULL";
    }
}
