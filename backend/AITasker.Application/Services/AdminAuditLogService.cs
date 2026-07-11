using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;
using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;

namespace AITasker.Application.Services;

public class AdminAuditLogService : IAdminAuditLogService
{
    private const int MaxPageSize = 200;

    private readonly IAdminAuditLogRepository _adminAuditLogRepository;

    public AdminAuditLogService(IAdminAuditLogRepository adminAuditLogRepository)
    {
        _adminAuditLogRepository = adminAuditLogRepository;
    }

    public async Task LogAsync(
        int? adminId,
        string action,
        string entityName,
        int? entityId,
        string? oldValue,
        string? newValue,
        string? reason)
    {
        if (string.IsNullOrWhiteSpace(action))
        {
            throw new InvalidOperationException("Audit action is required.");
        }

        if (string.IsNullOrWhiteSpace(entityName))
        {
            throw new InvalidOperationException("Audit entity name is required.");
        }

        var auditLog = new AdminAuditLog
        {
            AdminId = adminId,
            Action = action.Trim().ToUpperInvariant(),
            EntityName = entityName.Trim(),
            EntityId = entityId,
            OldValue = TrimToMaxLength(oldValue, 4000),
            NewValue = TrimToMaxLength(newValue, 4000),
            Reason = TrimToMaxLength(reason, 500),
            CreatedAt = DateTime.UtcNow
        };

        await _adminAuditLogRepository.AddAsync(auditLog);
        await _adminAuditLogRepository.SaveChangesAsync();
    }

    public async Task<List<AdminAuditLogResponse>> GetLogsAsync(
        AdminAuditLogQueryRequest request)
    {
        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 50 : request.PageSize;

        if (pageSize > MaxPageSize)
        {
            pageSize = MaxPageSize;
        }

        var logs = await _adminAuditLogRepository.GetLogsAsync(
            request.AdminId,
            request.Action,
            request.EntityName,
            request.EntityId,
            request.From?.UtcDateTime,
            request.To?.UtcDateTime,
            pageNumber,
            pageSize
        );

        return logs.Select(MapToResponse).ToList();
    }

    public async Task<AdminAuditLogResponse?> GetByIdAsync(int auditLogId)
    {
        var auditLog = await _adminAuditLogRepository.GetByIdAsync(auditLogId);

        return auditLog == null ? null : MapToResponse(auditLog);
    }

    private static AdminAuditLogResponse MapToResponse(AdminAuditLog auditLog)
    {
        return new AdminAuditLogResponse
        {
            AdminAuditLogId = auditLog.AdminAuditLogId,
            AdminId = auditLog.AdminId,
            AdminEmail = auditLog.Admin?.Email,
            AdminFullName = auditLog.Admin?.FullName,
            Action = auditLog.Action,
            EntityName = auditLog.EntityName,
            EntityId = auditLog.EntityId,
            OldValue = auditLog.OldValue,
            NewValue = auditLog.NewValue,
            Reason = auditLog.Reason,
            CreatedAt = auditLog.CreatedAt
        };
    }

    private static string? TrimToMaxLength(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmedValue = value.Trim();

        return trimmedValue.Length <= maxLength
            ? trimmedValue
            : trimmedValue[..maxLength];
    }
}
