using System.Security.Claims;
using AITasker.Application.DTOs.Requests;
using AITasker.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace AITasker.Api.Hubs
{
    [Authorize]
    public class ConversationHub : Hub
    {
        private readonly IConversationService _conversationService;

        public ConversationHub(IConversationService conversationService)
        {
            _conversationService = conversationService;
        }

        public async Task JoinConversation(int conversationId)
        {
            var userId = GetCurrentUserId();

            await _conversationService.GetConversationByIdAsync(
                userId,
                conversationId);

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                BuildConversationGroupName(conversationId));

            await Clients.Caller.SendAsync(
                "ConversationJoined",
                new
                {
                    conversationId,
                    joinedAt = DateTime.UtcNow
                });
        }

        public async Task LeaveConversation(int conversationId)
        {
            await Groups.RemoveFromGroupAsync(
                Context.ConnectionId,
                BuildConversationGroupName(conversationId));

            await Clients.Caller.SendAsync(
                "ConversationLeft",
                new
                {
                    conversationId,
                    leftAt = DateTime.UtcNow
                });
        }

        public async Task SendMessage(
            int conversationId,
            string content,
            string? messageType = null,
            string? attachmentUrl = null)
        {
            var userId = GetCurrentUserId();

            var request = new SendConversationMessageRequest
            {
                Content = content,
                MessageType = messageType,
                AttachmentUrl = attachmentUrl
            };

            var message = await _conversationService.SendMessageAsync(
                userId,
                conversationId,
                request);

            await Clients
                .Group(BuildConversationGroupName(conversationId))
                .SendAsync("ReceiveConversationMessage", message);
        }

        public async Task Typing(int conversationId)
        {
            var userId = GetCurrentUserId();

            await _conversationService.GetConversationByIdAsync(
                userId,
                conversationId);

            await Clients
                .OthersInGroup(BuildConversationGroupName(conversationId))
                .SendAsync("ConversationTyping", new
                {
                    conversationId,
                    userId,
                    typedAt = DateTime.UtcNow
                });
        }

        public async Task StopTyping(int conversationId)
        {
            var userId = GetCurrentUserId();

            await _conversationService.GetConversationByIdAsync(
                userId,
                conversationId);

            await Clients
                .OthersInGroup(BuildConversationGroupName(conversationId))
                .SendAsync("ConversationStopTyping", new
                {
                    conversationId,
                    userId,
                    stoppedAt = DateTime.UtcNow
                });
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                Context.User?.FindFirstValue("userId") ??
                Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
                Context.User?.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new HubException("Invalid user token.");
            }

            return userId;
        }

        private static string BuildConversationGroupName(int conversationId)
        {
            return $"Conversation_{conversationId}";
        }
    }
}