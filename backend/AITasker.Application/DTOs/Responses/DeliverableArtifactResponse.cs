namespace AITasker.Application.DTOs.Responses
{
    public class DeliverableArtifactResponse
    {
        public int DeliverableArtifactId { get; set; }

        public int DeliverableId { get; set; }

        public string ArtifactType { get; set; } = string.Empty;

        public string Label { get; set; } = string.Empty;

        public string Url { get; set; } = string.Empty;

        public string? Provider { get; set; }

        public string AccessLevel { get; set; } = string.Empty;

        public string? Version { get; set; }

        public string? CommitHash { get; set; }

        public string? Checksum { get; set; }

        public string ValidationStatus { get; set; } = string.Empty;

        public DateTime? ValidatedAt { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
