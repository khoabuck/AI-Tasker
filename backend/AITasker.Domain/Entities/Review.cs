namespace AITasker.Domain.Entities;

public class Review
{
    public int ReviewId { get; set; }

    public int ProjectId { get; set; }

    public int ReviewerId { get; set; }

    public int RevieweeId { get; set; }

    public int Rating { get; set; }

    public string Comment { get; set; } = string.Empty;

    // VISIBLE / HIDDEN
    public string Status { get; set; } = "VISIBLE";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Project Project { get; set; } = null!;
}
