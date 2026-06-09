using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces;

public interface IAiJobAssistantProvider
{
    Task<AiJobSuggestionResult> SuggestAsync(
        AiJobSuggestionRequest request,
        CancellationToken cancellationToken = default);
}
