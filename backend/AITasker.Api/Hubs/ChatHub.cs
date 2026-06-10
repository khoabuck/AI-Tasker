using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AITasker.Api.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        public async Task JoinConversation(int conversationId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, conversationId.ToString());
        }

        public async Task LeaveConversation(int conversationId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, conversationId.ToString());
        }

        public async Task SendMessage(int conversationId, string message)
        {
            if (string.IsNullOrWhiteSpace(message)) return;

            var nameIdentifier = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(nameIdentifier) || !int.TryParse(nameIdentifier, out int currentUserId))
            {
                throw new HubException("Unauthorized: Cannot detect authenticated user identity.");
            }

            try
            {
                await Clients.Group(conversationId.ToString()).SendAsync("ReceiveMessage", new
                {
                    conversationId = conversationId,
                    senderId = currentUserId, 
                    content = message,
                    createdAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                throw new HubException($"Failed to broadcast realtime message: {ex.Message}");
            }
        }
    }
}