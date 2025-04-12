using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace WeChat.Models
{
    public class Message
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SenderId { get; set; }

        [Required]
        public int ReceiverId { get; set; }

        public string Content { get; set; } = string.Empty;

        [Required]
        public DateTime SentAt { get; set; }

        public bool IsRead { get; set; }

        public bool IsDeleted { get; set; }

        // Navigation properties
        public virtual User Sender { get; set; } = new User();

        public virtual User Receiver { get; set; } = new User();

        public virtual ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();

        // Helper property
        public bool HasAttachments => Attachments != null && Attachments.Count > 0;
    }
}
