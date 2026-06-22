using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IBankAccountVerificationService
    {
        Task<BankAccountVerificationResponse> VerifyAsync(
            BankAccountVerificationRequest request);
    }
}