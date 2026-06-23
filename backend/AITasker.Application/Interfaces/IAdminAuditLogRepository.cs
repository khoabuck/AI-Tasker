using AITasker.Domain.Entities;

namespace AITasker.Application.Interfaces;

public interface IAdminAuditLogRepository
{
    Task AddAsync(AdminAuditLog auditLog);

    Task<List<AdminAuditLog>> GetLogsAsync(
        int? adminId,
        string? action,
        string? entityName,
        int? entityId,
        DateTime? from,
        DateTime? to,
        int pageNumber,
        int pageSize
    );

    Task<AdminAuditLog?> GetByIdAsync(int auditLogId);

    Task SaveChangesAsync();
}
