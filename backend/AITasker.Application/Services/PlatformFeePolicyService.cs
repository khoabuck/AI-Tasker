using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class PlatformFeePolicyService : IPlatformFeePolicyService
{
    private const decimal DefaultIndividualClientFeeRate = 5.00m;
    private const decimal DefaultBusinessClientFeeRate = 10.00m;
    private const decimal DefaultExpertFeeRate = 15.00m;
    private const decimal MinimumFeeRate = 0.00m;
    private const decimal MaximumFeeRate = 100.00m;

    private readonly IPlatformFeePolicyRepository _platformFeePolicyRepository;
    private readonly IAdminAuditLogService _adminAuditLogService;

    public PlatformFeePolicyService(
        IPlatformFeePolicyRepository platformFeePolicyRepository,
        IAdminAuditLogService adminAuditLogService)
    {
        _platformFeePolicyRepository = platformFeePolicyRepository;
        _adminAuditLogService = adminAuditLogService;
    }

    public async Task<PlatformFeePolicyResponse> GetActivePolicyAsync()
    {
        var policy = await GetOrCreateActivePolicyEntityAsync();

        return MapToResponse(policy);
    }

    public async Task<PlatformFeePolicyResponse> UpdateActivePolicyAsync(
        int adminId,
        UpdatePlatformFeePolicyRequest request)
    {
        ValidateUpdateRequest(request);

        var policy = await GetOrCreateActivePolicyEntityAsync();
        var oldValue = BuildAuditValue(policy);

        policy.IndividualClientFeeRate = RoundFeeRate(
            request.IndividualClientFeeRate
        );
        policy.BusinessClientFeeRate = RoundFeeRate(
            request.BusinessClientFeeRate
        );
        policy.ExpertFeeRate = RoundFeeRate(
            request.ExpertFeeRate
        );
        policy.UpdatedAt = DateTime.UtcNow;
        policy.UpdatedByAdminId = adminId;

        var newValue = BuildAuditValue(policy);

        await _platformFeePolicyRepository.SaveChangesAsync();

        await _adminAuditLogService.LogAsync(
            adminId,
            "UPDATE_PLATFORM_FEE_POLICY",
            nameof(PlatformFeePolicy),
            policy.PlatformFeePolicyId,
            oldValue,
            newValue,
            request.Reason
        );

        return MapToResponse(policy);
    }

    public async Task<decimal> GetFeeRateForClientTypeAsync(string clientType)
    {
        var normalizedClientType = clientType.Trim().ToUpperInvariant();
        var policy = await GetOrCreateActivePolicyEntityAsync();

        return normalizedClientType switch
        {
            "INDIVIDUAL" => policy.IndividualClientFeeRate,
            "BUSINESS" => policy.BusinessClientFeeRate,
            _ => throw new InvalidOperationException("Client type is invalid.")
        };
    }

    public async Task<decimal> GetExpertFeeRateAsync()
    {
        var policy = await GetOrCreateActivePolicyEntityAsync();

        return policy.ExpertFeeRate;
    }

    public async Task<PlatformFeePolicy> GetOrCreateActivePolicyEntityAsync()
    {
        var activePolicy = await _platformFeePolicyRepository.GetActiveAsync();

        if (activePolicy != null)
        {
            return activePolicy;
        }

        var defaultPolicy = new PlatformFeePolicy
        {
            IndividualClientFeeRate = DefaultIndividualClientFeeRate,
            BusinessClientFeeRate = DefaultBusinessClientFeeRate,
            ExpertFeeRate = DefaultExpertFeeRate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _platformFeePolicyRepository.AddAsync(defaultPolicy);
        await _platformFeePolicyRepository.SaveChangesAsync();

        return defaultPolicy;
    }

    private static void ValidateUpdateRequest(
        UpdatePlatformFeePolicyRequest request)
    {
        ValidateFeeRate(
            request.IndividualClientFeeRate,
            "Individual client fee rate"
        );

        ValidateFeeRate(
            request.BusinessClientFeeRate,
            "Business client fee rate"
        );

        ValidateFeeRate(
            request.ExpertFeeRate,
            "Expert fee rate"
        );

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new InvalidOperationException(
                "Reason is required when updating platform fee policy."
            );
        }

        if (request.Reason.Trim().Length > 500)
        {
            throw new InvalidOperationException(
                "Reason must be at most 500 characters."
            );
        }
    }

    private static void ValidateFeeRate(decimal value, string fieldName)
    {
        if (value < MinimumFeeRate || value > MaximumFeeRate)
        {
            throw new InvalidOperationException(
                $"{fieldName} must be between 0 and 100."
            );
        }
    }

    private static decimal RoundFeeRate(decimal value)
    {
        return Math.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static PlatformFeePolicyResponse MapToResponse(
        PlatformFeePolicy policy)
    {
        return new PlatformFeePolicyResponse
        {
            PlatformFeePolicyId = policy.PlatformFeePolicyId,
            IndividualClientFeeRate = policy.IndividualClientFeeRate,
            BusinessClientFeeRate = policy.BusinessClientFeeRate,
            ExpertFeeRate = policy.ExpertFeeRate,
            IsActive = policy.IsActive,
            CreatedAt = policy.CreatedAt,
            UpdatedAt = policy.UpdatedAt,
            UpdatedByAdminId = policy.UpdatedByAdminId,
            UpdatedByAdminEmail = policy.UpdatedByAdmin?.Email,
            UpdatedByAdminFullName = policy.UpdatedByAdmin?.FullName
        };
    }

    private static string BuildAuditValue(PlatformFeePolicy policy)
    {
        return string.Join("; ", new[]
        {
            $"PlatformFeePolicyId={policy.PlatformFeePolicyId}",
            $"IndividualClientFeeRate={policy.IndividualClientFeeRate}",
            $"BusinessClientFeeRate={policy.BusinessClientFeeRate}",
            $"ExpertFeeRate={policy.ExpertFeeRate}",
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
