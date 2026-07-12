namespace AITasker.Application.DTOs.Requests
{
    public class DeliverableArtifactRequest
    {
        public string ArtifactType { get; set; } = string.Empty;

        public string Label { get; set; } = string.Empty;

        public string Url { get; set; } = string.Empty;

        public string? Provider { get; set; }

        public string AccessLevel { get; set; } = "PUBLIC";

        public string? Version { get; set; }

        public string? CommitHash { get; set; }

        public string? Checksum { get; set; }
    }
}
