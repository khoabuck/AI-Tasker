using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace AITasker.Api.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        public async Task JoinConversation(int conversationId)
        {
            var currentUserId = GetCurrentUserId();

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                GetConversationGroupName(conversationId)
            );

            await Clients.Caller.SendAsync("JoinedConversation", new
            {
                conversationId,
                userId = currentUserId
            });
        }

        public async Task LeaveConversation(int conversationId)
        {
            await Groups.RemoveFromGroupAsync(
                Context.ConnectionId,
                GetConversationGroupName(conversationId)
            );

            await Clients.Caller.SendAsync("LeftConversation", new
            {
                conversationId
            });
        }

        public async Task SendMessage(int conversationId, string message)
        {
            if (conversationId <= 0)
                throw new HubException("Invalid conversation id.");

            if (string.IsNullOrWhiteSpace(message))
                throw new HubException("Message cannot be empty.");

            var currentUserId = GetCurrentUserId();

            await Clients
                .Group(GetConversationGroupName(conversationId))
                .SendAsync("ReceiveMessage", new
                {
                    conversationId,
                    senderId = currentUserId,
                    content = message.Trim(),
                    createdAt = DateTime.UtcNow
                });
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? Context.User?.FindFirstValue("userId")
                ?? Context.User?.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                throw new HubException("Unauthorized: Cannot detect authenticated user identity.");

            return userId;
        }

        private static string GetConversationGroupName(int conversationId)
        {
            return $"Conversation_{conversationId}";
        }
    }
}