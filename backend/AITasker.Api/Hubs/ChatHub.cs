using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace AITasker.Api.Hubs
{
    public class ChatHub : Hub
    {
        public async Task JoinConversation(int conversationId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, conversationId.ToString());
        }

        public async Task SendMessage(int conversationId, string senderId, string message)
        {
            await Clients.Group(conversationId.ToString()).SendAsync("ReceiveMessage", senderId, message);
        }
    }
}