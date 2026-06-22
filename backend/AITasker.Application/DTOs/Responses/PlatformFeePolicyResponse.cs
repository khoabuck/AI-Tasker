namespace AITasker.Application.DTOs.Responses;

public class PlatformFeePolicyResponse
{
    public int PlatformFeePolicyId { get; set; }

    public decimal IndividualClientFeeRate { get; set; }

    public decimal BusinessClientFeeRate { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByAdminId { get; set; }

    public string? UpdatedByAdminEmail { get; set; }

    public string? UpdatedByAdminFullName { get; set; }
}
