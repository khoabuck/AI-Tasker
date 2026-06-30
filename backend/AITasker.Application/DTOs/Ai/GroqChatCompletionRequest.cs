namespace AITasker.Application.DTOs.Ai;

public class GroqChatCompletionRequest
{
    public int? UserId { get; set; }

    public string Feature { get; set; } = string.Empty;

    public string? EntityType { get; set; }

    public int? EntityId { get; set; }

    public List<GroqChatMessage> Messages { get; set; } = new();

    public double Temperature { get; set; } = 0.2;

    public int? MaxTokens { get; set; }

    public bool JsonObjectResponse { get; set; }
}
