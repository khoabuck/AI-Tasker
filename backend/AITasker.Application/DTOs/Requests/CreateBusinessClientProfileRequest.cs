namespace AITasker.Application.DTOs.Requests;

public class CreateBusinessClientProfileRequest
{
    // Thông tin người đại diện tài khoản
    public string PhoneNumber { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    // Thông tin doanh nghiệp để verify bằng VietQR
    public string TaxCode { get; set; } = string.Empty;

    public string Industry { get; set; } = string.Empty;

    // Thông tin liên hệ doanh nghiệp
    public string? BusinessEmail { get; set; }

    public string? BusinessPhone { get; set; }
}