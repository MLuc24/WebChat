using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using WeChat.Data;
using WeChat.Hubs;
using WeChat.Models;
using WeChat.ViewModels;

namespace WeChat.Controllers
{
    [Authorize]
    public class MessageController : Controller
    {
        private readonly WebChatContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IHubContext<ChatHub> _hubContext;

        public MessageController(
            WebChatContext context,
            IWebHostEnvironment environment,
            IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _environment = environment;
            _hubContext = hubContext;
        }

        // GET: Message/Index
        public IActionResult Index()
        {
            return View();
        }

        // GET: Message/Conversation/5
        public IActionResult Conversation(int id)
        {
            ViewBag.OtherUserId = id;
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> GetConversations()
        {
            int currentUserId = GetCurrentUserId();

            // Fetch conversations involving the current user
            var conversations = await _context.Conversations
                .Include(c => c.User1)
                .Include(c => c.User2)
                .Where(c => c.User1Id == currentUserId || c.User2Id == currentUserId)
                .ToListAsync();

            var result = new List<ConversationViewModel>();

            foreach (var conversation in conversations)
            {
                // Determine the other user in the conversation
                var otherUser = conversation.GetOtherUser(currentUserId);
                if (otherUser == null) continue;

                // Fetch the last message in the conversation
                var lastMessage = await _context.Messages
                    .Where(m => (m.SenderId == conversation.User1Id && m.ReceiverId == conversation.User2Id) ||
                                (m.SenderId == conversation.User2Id && m.ReceiverId == conversation.User1Id))
                    .OrderByDescending(m => m.SentAt)
                    .FirstOrDefaultAsync();

                if (lastMessage == null) continue;

                // Add conversation details to the result
                // Update result.Add with null coalescing for ProfilePicture
                result.Add(new ConversationViewModel
                {
                    UserId = otherUser.UserId,
                    Username = otherUser.Username,
                    FullName = otherUser.FullName,
                    ProfilePicture = otherUser.ProfilePicture ?? string.Empty,
                    LastMessage = lastMessage.Content,
                    LastMessageDate = lastMessage.SentAt,
                    UnreadCount = conversation.GetUnreadCount(currentUserId),
                    IsOnline = otherUser.LastLogin.HasValue &&
                               (DateTime.Now - otherUser.LastLogin.Value).TotalMinutes < 15
                });

            }

            // Return the conversations sorted by the last message date
            return Json(result.OrderByDescending(c => c.LastMessageDate));
        }


        // GET: Message/GetMessages/5
        [HttpGet]
        public async Task<IActionResult> GetMessages(int id)
        {
            int currentUserId = GetCurrentUserId();

            // Find conversation or create if not exists
            var conversation = await GetOrCreateConversationAsync(currentUserId, id);

            // Mark messages as read
            await MarkConversationAsReadAsync(conversation, currentUserId);

            // Get messages
            var messages = await _context.Messages
                .Include(m => m.Attachments)
                .Where(m => m.SenderId == currentUserId && m.ReceiverId == id ||
                           m.SenderId == id && m.ReceiverId == currentUserId)
                .Where(m => !m.IsDeleted)
                .OrderBy(m => m.SentAt)
                .Select(m => new MessageViewModel
                {
                    Id = m.Id,
                    SenderId = m.SenderId,
                    ReceiverId = m.ReceiverId,
                    Content = m.Content,
                    SentAt = m.SentAt,
                    IsRead = m.IsRead,
                    IsMine = m.SenderId == currentUserId,
                    HasAttachments = m.HasAttachments,
                    Attachments = m.Attachments.Select(a => new AttachmentViewModel
                    {
                        Id = a.Id,
                        FileName = a.FileName,
                        FilePath = a.FilePath,
                        FileType = a.FileType,
                        FileSize = a.FileSize
                    }).ToList()
                })
                .ToListAsync();

            return Json(messages);
        }

        // POST: Message/SendMessage
        [HttpPost]
        public async Task<IActionResult> SendMessage([FromForm] SendMessageViewModel model)
        {
            // Check if there's something to send (either content or attachments)
            if (string.IsNullOrWhiteSpace(model.Content) &&
                (model.Attachments == null || model.Attachments.Count == 0))
            {
                return Json(new { success = false, errors = new[] { "Message must contain either text or attachments." } });
            }

            int currentUserId = GetCurrentUserId();

            // Find conversation or create if not exists
            var conversation = await GetOrCreateConversationAsync(currentUserId, model.ReceiverId);

            // Create new message
            var message = new Message
            {
                SenderId = currentUserId,
                ReceiverId = model.ReceiverId,
                Content = model.Content ?? string.Empty,
                SentAt = DateTime.Now,
                IsRead = false,
                IsDeleted = false,
                Attachments = new List<Attachment>()
            };

            // Process attachments if any
            if (model.Attachments != null && model.Attachments.Count > 0)
            {
                // Save message first to get ID
                _context.Messages.Add(message);
                await _context.SaveChangesAsync();

                await ProcessAttachmentsAsync(message, model.Attachments);
            }
            else
            {
                // Just add the message
                _context.Messages.Add(message);
            }

            // Update conversation
            conversation.LastActivity = DateTime.Now;
            conversation.IncreaseUnreadCount(model.ReceiverId);

            await _context.SaveChangesAsync();

            // Notify recipient
            var messageViewModel = new MessageViewModel
            {
                Id = message.Id,
                SenderId = message.SenderId,
                ReceiverId = message.ReceiverId,
                Content = message.Content,
                SentAt = message.SentAt,
                IsRead = message.IsRead,
                IsMine = false, // It's not mine for the recipient
                HasAttachments = message.HasAttachments,
                Attachments = message.Attachments.Select(a => new AttachmentViewModel
                {
                    Id = a.Id,
                    FileName = a.FileName,
                    FilePath = a.FilePath,
                    FileType = a.FileType,
                    FileSize = a.FileSize
                }).ToList()
            };

            await _hubContext.Clients.User(model.ReceiverId.ToString())
                .SendAsync("ReceiveMessage", messageViewModel);

            // Return success with created message
            messageViewModel.IsMine = true; // Now it's mine for the sender
            return Json(new { success = true, message = messageViewModel });
        }

        // POST: Message/MarkAsRead/5
        [HttpPost]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            int currentUserId = GetCurrentUserId();

            // Find conversation
            var conversation = await GetOrCreateConversationAsync(currentUserId, id);

            // Mark as read
            await MarkConversationAsReadAsync(conversation, currentUserId);

            return Json(new { success = true });
        }

        // DELETE: Message/DeleteMessage/5/10
        [HttpDelete]
        public async Task<IActionResult> DeleteMessage(int userId, int messageId)
        {
            int currentUserId = GetCurrentUserId();

            // Find message
            var message = await _context.Messages.FindAsync(messageId);

            if (message == null)
            {
                return NotFound();
            }

            // Check if current user is sender or receiver
            if (message.SenderId != currentUserId && message.ReceiverId != currentUserId)
            {
                return Forbid();
            }

            // Mark as deleted
            message.IsDeleted = true;
            await _context.SaveChangesAsync();

            // Notify other user
            int otherUserId = message.SenderId == currentUserId ? message.ReceiverId : message.SenderId;
            await _hubContext.Clients.User(otherUserId.ToString())
                .SendAsync("MessageDeleted", messageId);

            return Json(new { success = true });
        }

        // GET: Message/GetUsers
        [HttpGet]
        public async Task<IActionResult> GetUsers(string search = "")
        {
            int currentUserId = GetCurrentUserId();

            var query = _context.Users.AsQueryable();

            // Exclude current user
            query = query.Where(u => u.UserId != currentUserId);

            // Apply search if provided
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.ToLower();
                query = query.Where(u => u.Username.ToLower().Contains(search) ||
                                        u.FullName.ToLower().Contains(search) ||
                                        u.Email.ToLower().Contains(search));
            }

            var users = await query
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.FullName,
                    u.ProfilePicture,
                    u.Department,
                    IsOnline = u.LastLogin.HasValue && (DateTime.Now - u.LastLogin.Value).TotalMinutes < 15
                })
                .ToListAsync();

            return Json(users);
        }

        #region Helper Methods

        private async Task<Conversation> GetOrCreateConversationAsync(int user1Id, int user2Id)
        {
            // Make sure user1Id is always the smaller one for consistency
            if (user1Id > user2Id)
            {
                var temp = user1Id;
                user1Id = user2Id;
                user2Id = temp;
            }

            // Try to find existing conversation
            var conversation = await _context.Conversations
                .FirstOrDefaultAsync(c => c.User1Id == user1Id && c.User2Id == user2Id);

            // Create new if not exists
            if (conversation == null)
            {
                conversation = new Conversation
                {
                    User1Id = user1Id,
                    User2Id = user2Id,
                    LastActivity = DateTime.Now,
                    UnreadCountUser1 = 0,
                    UnreadCountUser2 = 0
                };

                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();
            }

            return conversation;
        }

        private async Task MarkConversationAsReadAsync(Conversation conversation, int userId)
        {
            // Mark conversation as read for this user
            conversation.MarkAsRead(userId);

            // Mark individual messages as read
            var unreadMessages = await _context.Messages
                .Where(m => m.ReceiverId == userId &&
                           (m.SenderId == conversation.User1Id || m.SenderId == conversation.User2Id) &&
                           !m.IsRead && !m.IsDeleted)
                .ToListAsync();

            if (unreadMessages.Any())
            {
                foreach (var message in unreadMessages)
                {
                    message.IsRead = true;

                    // Notify sender that message was read
                    await _hubContext.Clients.User(message.SenderId.ToString())
                        .SendAsync("MessageRead", message.Id);
                }

                await _context.SaveChangesAsync();
            }
        }

        private async Task ProcessAttachmentsAsync(Message message, List<IFormFile> files)
        {
            // Create directory if not exists
            string uploadDirectory = Path.Combine(_environment.WebRootPath, "uploads", "messages", message.Id.ToString());
            Directory.CreateDirectory(uploadDirectory);

            foreach (var file in files)
            {
                if (file.Length > 0)
                {
                    // Generate safe filename
                    string fileName = Path.GetFileName(file.FileName);
                    string filePath = Path.Combine(uploadDirectory, fileName);

                    // Save file
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }

                    // Create attachment record
                    var attachment = new Attachment
                    {
                        MessageId = message.Id,
                        FileName = fileName,
                        FilePath = $"/uploads/messages/{message.Id}/{fileName}",
                        FileType = file.ContentType,
                        FileSize = file.Length,
                        UploadedAt = DateTime.Now,
                        Message = message // Set the required 'Message' property
                    };

                    message.Attachments.Add(attachment);
                }
            }
        }
        // Add this helper method to the MessageController class
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
}
