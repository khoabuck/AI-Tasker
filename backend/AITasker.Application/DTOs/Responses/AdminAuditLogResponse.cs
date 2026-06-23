namespace AITasker.Application.DTOs.Responses;

public class AdminAuditLogResponse
{
    public int AdminAuditLogId { get; set; }

    public int? AdminId { get; set; }

    public string? AdminEmail { get; set; }

    public string? AdminFullName { get; set; }

    public string Action { get; set; } = string.Empty;

    public string EntityName { get; set; } = string.Empty;

    public int? EntityId { get; set; }

    public string? OldValue { get; set; }

    public string? NewValue { get; set; }

    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; }
}
