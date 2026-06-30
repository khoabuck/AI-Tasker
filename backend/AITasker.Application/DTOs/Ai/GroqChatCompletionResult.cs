namespace AITasker.Application.DTOs.Ai;

public class GroqChatCompletionResult
{
    public string Content { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public bool UsedFallback { get; set; }

    public int PromptTokens { get; set; }

    public int CompletionTokens { get; set; }

    public int TotalTokens { get; set; }

    public string RawResponse { get; set; } = string.Empty;
}
