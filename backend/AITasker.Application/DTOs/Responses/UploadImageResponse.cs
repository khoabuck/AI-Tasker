namespace AITasker.Application.DTOs.Responses;

public class UploadImageResponse
{
    public string Url { get; set; } = string.Empty;

    public string PublicId { get; set; } = string.Empty;

    public string Format { get; set; } = string.Empty;

    public int Width { get; set; }

    public int Height { get; set; }

    public long Bytes { get; set; }
}