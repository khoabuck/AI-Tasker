using AITasker.Application.DTOs.Requests;
using AITasker.Application.DTOs.Responses;

namespace AITasker.Application.Interfaces
{
    public interface IConversationService
    {
        Task<ConversationResponse> CreateOrGetConversationAsync(
            int currentUserId,
            CreateConversationRequest request);

        Task<IReadOnlyList<ConversationResponse>> GetMyConversationsAsync(
            int currentUserId);

        Task<ConversationResponse> GetConversationByIdAsync(
            int currentUserId,
            int conversationId);

        Task<IReadOnlyList<ConversationMessageResponse>> GetMessagesAsync(
            int currentUserId,
            int conversationId);

        Task<ConversationMessageResponse> SendMessageAsync(
            int currentUserId,
            int conversationId,
            SendConversationMessageRequest request);
    }
}