using AITasker.Application.DTOs.Ai;

namespace AITasker.Application.Interfaces;

public interface IGroqChatCompletionService
{
    Task<GroqChatCompletionResult> CreateChatCompletionAsync(
        GroqChatCompletionRequest request,
        CancellationToken cancellationToken = default
    );
}
