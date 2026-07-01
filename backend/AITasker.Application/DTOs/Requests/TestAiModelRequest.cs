namespace AITasker.Application.DTOs.Requests;

public class TestAiModelRequest
{
    public string? Model { get; set; }

    public string Message { get; set; } = "Return JSON only: {\"ok\": true}";

    public bool JsonObjectResponse { get; set; } = true;

    public int MaxTokens { get; set; } = 128;

    public double Temperature { get; set; } = 0;
}
