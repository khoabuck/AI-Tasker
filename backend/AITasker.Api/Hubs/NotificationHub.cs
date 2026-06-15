using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace AITasker.Api.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var userId = GetCurrentUserId();

            await Groups.AddToGroupAsync(
                Context.ConnectionId,
                $"User_{userId}");

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = TryGetCurrentUserId();

            if (!string.IsNullOrWhiteSpace(userId))
            {
                await Groups.RemoveFromGroupAsync(
                    Context.ConnectionId,
                    $"User_{userId}");
            }

            await base.OnDisconnectedAsync(exception);
        }

        private string GetCurrentUserId()
        {
            var userId =
                Context.User?.FindFirstValue("userId") ??
                Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
                Context.User?.FindFirstValue("sub");

            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new HubException("Unauthorized: Cannot detect authenticated user identity.");
            }

            return userId;
        }

        private string? TryGetCurrentUserId()
        {
            return Context.User?.FindFirstValue("userId") ??
                   Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ??
                   Context.User?.FindFirstValue("sub");
        }
    }
}