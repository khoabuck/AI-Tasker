namespace AITasker.Application.DTOs.Requests;

public class CreateExpertCertificateRequest
{
    public string CertificateUrl { get; set; } = string.Empty;

    // COURSE_CERTIFICATE / PROFESSIONAL_CERTIFICATE / BOOTCAMP_CERTIFICATE /
    // DEGREE_CERTIFICATE / AWARD_CERTIFICATE / OTHER
    public string CertificateType { get; set; } = string.Empty;
}
