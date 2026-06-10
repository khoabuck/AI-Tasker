namespace AITasker.Application.DTOs.Requests;

public class UrlInspectionTarget
{
    public string Label { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public bool IsRequiredProof { get; set; }
}