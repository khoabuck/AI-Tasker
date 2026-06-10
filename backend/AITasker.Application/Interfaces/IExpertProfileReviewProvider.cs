using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IExpertProfileReviewProvider
{
    Task<ExpertProfileReviewProviderResult> ReviewAsync(
        ExpertProfileReviewProviderRequest request,
        CancellationToken cancellationToken = default
    );
}