namespace AITasker.Application.DTOs.Requests;

public class UpdateIndividualClientProfileRequest
{
    public string? FullName { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public string? AvatarUrl { get; set; }
}
