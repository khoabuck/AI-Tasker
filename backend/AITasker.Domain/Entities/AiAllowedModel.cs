namespace AITasker.Domain.Entities;

public class AiAllowedModel
{
    public int AiAllowedModelId { get; set; }

    public string Provider { get; set; } = "Groq";

    public string Model { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;

    public bool SupportsJsonObjectResponse { get; set; } = true;

    public int MaxOutputTokens { get; set; } = 4096;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public User? UpdatedByAdmin { get; set; }
}
