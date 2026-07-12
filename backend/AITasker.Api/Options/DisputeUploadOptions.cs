namespace AITasker.Api.Options;

public class DisputeUploadOptions
{
    public const string SectionName = "DisputeUpload";

    public int MaxImagesPerRequest { get; set; } = 10;

    public long MaxTotalImageSizeBytes { get; set; } = 60L * 1024L * 1024L;

    public long MaxRequestBodySizeBytes { get; set; } = 64L * 1024L * 1024L;
}
