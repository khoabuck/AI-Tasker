namespace AITasker.Application.DTOs.Responses;

public class UrlInspectionResult
{
    public string Label { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public bool IsRequiredProof { get; set; }

    public bool IsReachable { get; set; }

    public bool IsBlockedOrUnknown { get; set; }

    public int? StatusCode { get; set; }

    public string? ContentType { get; set; }

    public string? PageTitle { get; set; }

    public string? MetaDescription { get; set; }

    public string? TextSnippet { get; set; }

    public string? ErrorMessage { get; set; }
}