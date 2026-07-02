namespace AITasker.Application.DTOs.Requests;

public class RecordAIUsageRequest
{
    public int? UserId { get; set; }

    public string ModuleName { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;

    public string ModelName { get; set; } = string.Empty;

    public string? RequestPayload { get; set; }

    public string? ResponsePayload { get; set; }

    public string Status { get; set; } = "SUCCESS";

    public string? ErrorMessage { get; set; }

    public bool IsChargedToPlatform { get; set; } = true;

    public bool IsChargedToUser { get; set; }
}
