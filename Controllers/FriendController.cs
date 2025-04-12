using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using WeChat.Data;
using WeChat.Hubs;
using WeChat.Models;

namespace WeChat.Controllers
{
    [Authorize]
    public class FriendController : Controller
    {
        private readonly WebChatContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public FriendController(WebChatContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            int currentUserId = GetCurrentUserId();

            // Get all friends (accepted requests)
            var friends = await GetFriendsAsync(currentUserId);

            // Get pending friend requests
            var pendingRequests = await GetPendingRequestsAsync(currentUserId);

            return View(new
            {
                Friends = friends,
                PendingRequests = pendingRequests
            });
        }

        [HttpPost]
        public async Task<IActionResult> SendRequest([FromBody] FriendRequestViewModel model)
        {
            int currentUserId = GetCurrentUserId();

            // Check if there's already a request
            var existingRequest = await _context.Friends
                .FirstOrDefaultAsync(f =>
                    (f.RequesterId == currentUserId && f.RecipientId == model.RecipientId) ||
                    (f.RequesterId == model.RecipientId && f.RecipientId == currentUserId));

            if (existingRequest != null)
            {
                return Json(new { success = false, message = "Friend request already exists" });
            }

            // Create new request
            var friendRequest = new Friend
            {
                RequesterId = currentUserId,
                RecipientId = model.RecipientId,
                Status = FriendStatus.Pending,
                RequestDate = DateTime.Now
            };

            _context.Friends.Add(friendRequest);
            await _context.SaveChangesAsync();

            // Get requester info for notification
            var requester = await _context.Users.FindAsync(currentUserId);

            // Notify recipient
            await _hubContext.Clients.User(model.RecipientId.ToString())
                .SendAsync("FriendRequestReceived", new
                {
                    requesterId = currentUserId,
                    requesterName = requester.FullName ?? requester.Username
                });

            return Json(new { success = true });
        }

        [HttpPost]
        public async Task<IActionResult> RespondToRequest([FromBody] FriendResponseViewModel model)
        {
            int currentUserId = GetCurrentUserId();

            // Find the request
            var request = await _context.Friends
                .FirstOrDefaultAsync(f => f.RequesterId == model.RequesterId && f.RecipientId == currentUserId);

            if (request == null)
            {
                return Json(new { success = false, message = "Friend request not found" });
            }

            // Update request status
            if (model.Accept)
            {
                request.Status = FriendStatus.Accepted;
                request.AcceptedDate = DateTime.Now;
            }
            else
            {
                request.Status = FriendStatus.Rejected;
            }

            await _context.SaveChangesAsync();

            // Get recipient info for notification
            var recipient = await _context.Users.FindAsync(currentUserId);

            // Notify requester
            await _hubContext.Clients.User(model.RequesterId.ToString())
                .SendAsync("FriendRequestUpdated", new
                {
                    userId = currentUserId,
                    userName = recipient.FullName ?? recipient.Username,
                    status = model.Accept ? "Accepted" : "Rejected"
                });

            return Json(new { success = true });
        }

        [HttpPost]
        public async Task<IActionResult> RemoveFriend(int friendId)
        {
            int currentUserId = GetCurrentUserId();

            // Find friendship record
            var friendship = await _context.Friends
                .FirstOrDefaultAsync(f =>
                    (f.RequesterId == currentUserId && f.RecipientId == friendId) ||
                    (f.RequesterId == friendId && f.RecipientId == currentUserId));

            if (friendship == null)
            {
                return Json(new { success = false, message = "Friend not found" });
            }

            // Remove the friendship
            _context.Friends.Remove(friendship);
            await _context.SaveChangesAsync();

            // Notify the other user
            var otherUserId = friendship.RequesterId == currentUserId ?
                friendship.RecipientId : friendship.RequesterId;

            await _hubContext.Clients.User(otherUserId.ToString())
                .SendAsync("FriendRemoved", currentUserId);

            return Json(new { success = true });
        }

        #region Helper Methods

        // Add these methods to the FriendController class

        [HttpGet]
        public async Task<IActionResult> GetFriends()
        {
            int currentUserId = GetCurrentUserId();
            var friends = await GetFriendsAsync(currentUserId);
            return Json(friends);
        }

        [HttpGet]
        public async Task<IActionResult> GetPendingRequests()
        {
            int currentUserId = GetCurrentUserId();
            var requests = await GetPendingRequestsAsync(currentUserId);
            return Json(requests);
        }


        private async Task<object[]> GetFriendsAsync(int userId)
        {
            // Get accepted friend requests where the user is either requester or recipient
            var friendships = await _context.Friends
                .Include(f => f.Requester)
                .Include(f => f.Recipient)
                .Where(f => f.Status == FriendStatus.Accepted &&
                           (f.RequesterId == userId || f.RecipientId == userId))
                .ToListAsync();

            // Map to view model
            return friendships.Select(f => {
                var friend = f.RequesterId == userId ? f.Recipient : f.Requester;
                return new
                {
                    UserId = friend.UserId,
                    Username = friend.Username,
                    FullName = friend.FullName,
                    ProfilePicture = friend.ProfilePicture,
                    Department = friend.Department,
                    IsOnline = friend.LastLogin.HasValue &&
                              (DateTime.Now - friend.LastLogin.Value).TotalMinutes < 15,
                    FriendshipDate = f.AcceptedDate ?? f.RequestDate
                };
            }).OrderBy(f => f.FullName ?? f.Username).ToArray();
        }

        private async Task<object[]> GetPendingRequestsAsync(int userId)
        {
            // Get pending friend requests received by the user
            var pendingRequests = await _context.Friends
                .Include(f => f.Requester)
                .Where(f => f.Status == FriendStatus.Pending && f.RecipientId == userId)
                .ToListAsync();

            // Map to view model
            return pendingRequests.Select(f => {
                var requester = f.Requester;
                return new
                {
                    RequestId = f.Id,
                    UserId = requester.UserId,
                    Username = requester.Username,
                    FullName = requester.FullName,
                    ProfilePicture = requester.ProfilePicture,
                    Department = requester.Department,
                    RequestDate = f.RequestDate
                };
            }).ToArray();
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim))
            {
                throw new UnauthorizedAccessException("User is not authenticated properly.");
            }
            return int.Parse(userIdClaim);
        }

        #endregion
    }

    public class FriendRequestViewModel
    {
        public int RecipientId { get; set; }
    }

    public class FriendResponseViewModel
    {
        public int RequesterId { get; set; }
        public bool Accept { get; set; }
    }
}
