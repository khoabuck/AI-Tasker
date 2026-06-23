using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IAdminAuditLogService
{
    Task LogAsync(
        int? adminId,
        string action,
        string entityName,
        int? entityId,
        string? oldValue,
        string? newValue,
        string? reason
    );

    Task<List<AdminAuditLogResponse>> GetLogsAsync(
        AdminAuditLogQueryRequest request
    );

    Task<AdminAuditLogResponse?> GetByIdAsync(int auditLogId);
}
