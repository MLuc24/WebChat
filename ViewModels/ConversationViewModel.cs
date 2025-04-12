using System;

namespace WeChat.ViewModels
{
    // Update ConversationViewModel.cs to include IsFriend property
    public class ConversationViewModel
    {
        public int UserId { get; set; }
        public string Username { get; set; }
        public string FullName { get; set; }
        public string ProfilePicture { get; set; }
        public string LastMessage { get; set; }
        public DateTime LastMessageDate { get; set; }
        public int UnreadCount { get; set; }
        public bool IsOnline { get; set; }
        public bool IsFriend { get; set; }
    }
}
