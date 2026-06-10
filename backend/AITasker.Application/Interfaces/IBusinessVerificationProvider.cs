using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IBusinessVerificationProvider
{
    Task<BusinessVerificationProviderResult> VerifyAsync(
        BusinessVerificationProviderRequest request
    );
}