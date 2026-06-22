using AITasker.Application.Interfaces;
using AITasker.Domain.Entities;
using AITasker.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AITasker.Infrastructure.Repositories;

public class AdminAuditLogRepository : IAdminAuditLogRepository
{
    private readonly AITaskerDbContext _dbContext;

    public AdminAuditLogRepository(AITaskerDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(AdminAuditLog auditLog)
    {
        await _dbContext.AdminAuditLogs.AddAsync(auditLog);
    }

    public async Task<List<AdminAuditLog>> GetLogsAsync(
        int? adminId,
        string? action,
        string? entityName,
        int? entityId,
        DateTime? from,
        DateTime? to,
        int pageNumber,
        int pageSize)
    {
        var query = _dbContext.AdminAuditLogs
            .Include(x => x.Admin)
            .AsQueryable();

        if (adminId.HasValue)
        {
            query = query.Where(x => x.AdminId == adminId.Value);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            var normalizedAction = action.Trim().ToUpperInvariant();

            query = query.Where(x => x.Action == normalizedAction);
        }

        if (!string.IsNullOrWhiteSpace(entityName))
        {
            var normalizedEntityName = entityName.Trim();

            query = query.Where(x => x.EntityName == normalizedEntityName);
        }

        if (entityId.HasValue)
        {
            query = query.Where(x => x.EntityId == entityId.Value);
        }

        if (from.HasValue)
        {
            query = query.Where(x => x.CreatedAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(x => x.CreatedAt <= to.Value);
        }

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<AdminAuditLog?> GetByIdAsync(int auditLogId)
    {
        return await _dbContext.AdminAuditLogs
            .Include(x => x.Admin)
            .FirstOrDefaultAsync(x => x.AdminAuditLogId == auditLogId);
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}
