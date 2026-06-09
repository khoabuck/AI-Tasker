using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace AITasker.Api.Hubs
{
    public class NotificationHub : Hub
    {
        public async Task RegisterUserNotifications(string userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
        }
    }
}