using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace WeChat.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        // User connects to hub
        public override async Task OnConnectedAsync()
        {
            // Get user id from claims
            string? userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!string.IsNullOrEmpty(userId))
            {
                // Add to user group (for direct messaging)
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);

                // Notify others that user is online
                await Clients.Others.SendAsync("UserOnline", userId);
            }

            await base.OnConnectedAsync();
        }

        // User disconnects from hub
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // Get user id from claims
            string? userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!string.IsNullOrEmpty(userId))
            {
                // Remove from user group
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);

                // Notify others that user is offline
                await Clients.Others.SendAsync("UserOffline", userId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        // User sends typing status
        public async Task SendTypingStatus(int receiverId, bool isTyping)
        {
            // Get user id from claims
            string? userIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

            if (int.TryParse(userIdStr, out int userId))
            {
                // Send typing status to receiver
                await Clients.User(receiverId.ToString()).SendAsync("ReceiveTypingStatus", userId, isTyping);
            }
        }
    }
}
