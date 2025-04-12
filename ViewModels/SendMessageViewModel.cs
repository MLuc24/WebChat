using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace WeChat.ViewModels
{
    public class SendMessageViewModel
    {
        public int ReceiverId { get; set; }

        // Not required, so can send messages with only attachments
        public string Content { get; set; } = string.Empty;

        public List<IFormFile> Attachments { get; set; } = new List<IFormFile>();
    }
}
