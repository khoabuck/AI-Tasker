namespace AITasker.Application.DTOs.Requests;

public class CreateAiAllowedModelRequest
{
    public string Model { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;

    public bool SupportsJsonObjectResponse { get; set; } = true;

    public int MaxOutputTokens { get; set; } = 4096;

    public string? Notes { get; set; }

    public string Reason { get; set; } = string.Empty;
}
