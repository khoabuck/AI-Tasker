using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class LoginSecurityPolicyService : ILoginSecurityPolicyService
{
    private const int DefaultMaxFailedLoginAttempts = 5;
    private const int DefaultLockoutDurationMinutes = 15;
    private const int MinimumFailedLoginAttempts = 1;
    private const int MaximumFailedLoginAttempts = 20;
    private const int MinimumLockoutDurationMinutes = 1;
    private const int MaximumLockoutDurationMinutes = 1440;

    private readonly ILoginSecurityPolicyRepository _loginSecurityPolicyRepository;
    private readonly IAdminAuditLogService _adminAuditLogService;

    public LoginSecurityPolicyService(
        ILoginSecurityPolicyRepository loginSecurityPolicyRepository,
        IAdminAuditLogService adminAuditLogService)
    {
        _loginSecurityPolicyRepository = loginSecurityPolicyRepository;
        _adminAuditLogService = adminAuditLogService;
    }

    public async Task<LoginSecurityPolicyResponse> GetActivePolicyAsync()
    {
        var policy = await GetOrCreateActivePolicyEntityAsync();

        return MapToResponse(policy);
    }

    public async Task<LoginSecurityPolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdateLoginSecurityPolicyRequest request)
    {
        ValidateUpdateRequest(request);

        var policy = await GetOrCreateActivePolicyEntityAsync();
        var oldValue = BuildAuditValue(policy);

        policy.MaxFailedLoginAttempts = request.MaxFailedLoginAttempts;
        policy.LockoutDurationMinutes = request.LockoutDurationMinutes;
        policy.IsEnabled = request.IsEnabled;
        policy.UpdatedAt = DateTime.UtcNow;
        policy.UpdatedByAdminId = adminId;

        var newValue = BuildAuditValue(policy);

        await _loginSecurityPolicyRepository.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UPDATE_LOGIN_SECURITY_POLICY",
            nameof(LoginSecurityPolicy),
            policy.LoginSecurityPolicyId,
            oldValue,
            newValue,
            string.IsNullOrWhiteSpace(request.Reason)
                ? null
                : request.Reason.Trim()
        );

        return MapToResponse(policy);
    }

    public async Task<LoginSecurityPolicy> GetOrCreateActivePolicyEntityAsync()
    {
        var activePolicy = await _loginSecurityPolicyRepository.GetActiveAsync();

        if (activePolicy != null)
        {
            return activePolicy;
        }

        var defaultPolicy = new LoginSecurityPolicy
        {
            MaxFailedLoginAttempts = DefaultMaxFailedLoginAttempts,
            LockoutDurationMinutes = DefaultLockoutDurationMinutes,
            IsEnabled = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _loginSecurityPolicyRepository.AddAsync(defaultPolicy);
        await _loginSecurityPolicyRepository.SaveChangesAsync();

        return defaultPolicy;
    }

    private static void ValidateUpdateRequest(
        UpdateLoginSecurityPolicyRequest request)
    {
        if (request.MaxFailedLoginAttempts < MinimumFailedLoginAttempts
            || request.MaxFailedLoginAttempts > MaximumFailedLoginAttempts)
        {
            throw new InvalidOperationException(
                $"Maximum failed login attempts must be between {MinimumFailedLoginAttempts} and {MaximumFailedLoginAttempts}."
            );
        }

        if (request.LockoutDurationMinutes < MinimumLockoutDurationMinutes
            || request.LockoutDurationMinutes > MaximumLockoutDurationMinutes)
        {
            throw new InvalidOperationException(
                $"Lockout duration must be between {MinimumLockoutDurationMinutes} and {MaximumLockoutDurationMinutes} minutes."
            );
        }

        if (!string.IsNullOrWhiteSpace(request.Reason)
            && request.Reason.Trim().Length > 500)
        {
            throw new InvalidOperationException(
                "Reason must be at most 500 characters."
            );
        }
    }

    private static LoginSecurityPolicyResponse MapToResponse(
        LoginSecurityPolicy policy)
    {
        return new LoginSecurityPolicyResponse
        {
            LoginSecurityPolicyId = policy.LoginSecurityPolicyId,
            MaxFailedLoginAttempts = policy.MaxFailedLoginAttempts,
            LockoutDurationMinutes = policy.LockoutDurationMinutes,
            IsEnabled = policy.IsEnabled,
            CreatedAt = policy.CreatedAt,
            UpdatedAt = policy.UpdatedAt,
            UpdatedByAdminId = policy.UpdatedByAdminId,
            UpdatedByAdminEmail = policy.UpdatedByAdmin?.Email,
            UpdatedByAdminFullName = policy.UpdatedByAdmin?.FullName
        };
    }

    private static string BuildAuditValue(LoginSecurityPolicy policy)
    {
        return string.Join("; ", new[]
        {
            $"LoginSecurityPolicyId={policy.LoginSecurityPolicyId}",
            $"MaxFailedLoginAttempts={policy.MaxFailedLoginAttempts}",
            $"LockoutDurationMinutes={policy.LockoutDurationMinutes}",
            $"IsEnabled={policy.IsEnabled}",
            $"IsActive={policy.IsActive}",
            $"UpdatedByAdminId={policy.UpdatedByAdminId?.ToString() ?? "NULL"}",
            $"UpdatedAt={FormatDateTime(policy.UpdatedAt)}"
        });
    }

    private static string FormatDateTime(DateTime? value)
    {
        return value.HasValue
            ? value.Value.ToString("O")
            : "NULL";
    }
}
