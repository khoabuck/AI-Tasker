using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IBusinessVerificationService
{
    Task<List<BusinessVerificationResponse>> GetPendingAsync();

    Task<BusinessVerificationResponse> ApproveAsync(int businessProfileId);

    Task<BusinessVerificationResponse> RejectAsync(
        int businessProfileId,
        RejectBusinessVerificationRequest request
    );
}