using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AITasker.Api.Controllers;

[ApiController]
[Route("api/admin/audit-logs")]
[Authorize(Roles = "ADMIN")]
public class AdminAuditLogsController : ControllerBase
{
    private readonly IAdminAuditLogService _adminAuditLogService;

    public AdminAuditLogsController(IAdminAuditLogService adminAuditLogService)
    {
        _adminAuditLogService = adminAuditLogService;
    }

    // GET /api/admin/audit-logs?action=LOCK_USER&entityName=User&entityId=1
    [HttpGet]
    public async Task<IActionResult> GetLogs(
        [FromQuery] AdminAuditLogQueryRequest request)
    {
        var logs = await _adminAuditLogService.GetLogsAsync(request);

        return Ok(logs);
    }

    // GET /api/admin/audit-logs/1
    [HttpGet("{auditLogId:int}")]
    public async Task<IActionResult> GetById(int auditLogId)
    {
        var auditLog = await _adminAuditLogService.GetByIdAsync(auditLogId);

        if (auditLog == null)
        {
            return NotFound(new
            {
                message = "Audit log not found."
            });
        }

        return Ok(auditLog);
    }
}
