namespace AITasker.Domain.Entities;

public class PlatformFeePolicy
{
    public int PlatformFeePolicyId { get; set; }

    public decimal IndividualClientFeeRate { get; set; } = 5.00m;

    public decimal BusinessClientFeeRate { get; set; } = 10.00m;

    public decimal ExpertFeeRate { get; set; } = 15.00m;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public User? UpdatedByAdmin { get; set; }
}