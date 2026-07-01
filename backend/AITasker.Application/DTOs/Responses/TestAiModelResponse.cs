namespace AITasker.Application.DTOs.Responses;

public class TestAiModelResponse
{
    public bool Ok { get; set; }

    public string Provider { get; set; } = "Groq";

    public string Model { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public int? StatusCode { get; set; }

    public int PromptTokens { get; set; }

    public int CompletionTokens { get; set; }

    public int TotalTokens { get; set; }

    public long LatencyMs { get; set; }

    public string? Content { get; set; }

    public string? ErrorCode { get; set; }

    public string? Message { get; set; }
}
