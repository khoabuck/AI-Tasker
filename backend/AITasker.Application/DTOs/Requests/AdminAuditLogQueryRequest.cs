namespace AITasker.Application.DTOs.Requests;

public class AdminAuditLogQueryRequest
{
    public int? AdminId { get; set; }

    public string? Action { get; set; }

    public string? EntityName { get; set; }

    public int? EntityId { get; set; }

    public DateTimeOffset? From { get; set; }

    public DateTimeOffset? To { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 50;
}
