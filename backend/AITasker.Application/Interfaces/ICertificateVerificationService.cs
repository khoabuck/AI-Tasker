using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface ICertificateVerificationService
{
    Task<CertificateVerificationResult> VerifyAsync(CertificateVerificationRequest request);

    Task<List<CertificateVerificationResult>> VerifyManyAsync(
        List<CertificateVerificationRequest> requests
    );
}