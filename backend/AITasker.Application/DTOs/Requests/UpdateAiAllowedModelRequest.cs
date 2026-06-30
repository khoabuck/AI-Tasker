namespace AITasker.Application.DTOs.Requests;

public class UpdateAiAllowedModelRequest
{
    public string DisplayName { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    public bool SupportsJsonObjectResponse { get; set; }

    public int MaxOutputTokens { get; set; }

    public string? Notes { get; set; }

    public string Reason { get; set; } = string.Empty;
}
