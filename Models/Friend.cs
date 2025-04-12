// Models/Friend.cs
using System;
using System.ComponentModel.DataAnnotations;

namespace WeChat.Models
{
    public class Friend
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int RequesterId { get; set; }

        [Required]
        public int RecipientId { get; set; }

        [Required]
        public FriendStatus Status { get; set; }

        public DateTime RequestDate { get; set; }
        public DateTime? AcceptedDate { get; set; }

        // Navigation properties
        public virtual User? Requester { get; set; }
        public virtual User? Recipient { get; set; }
    }

    public enum FriendStatus
    {
        Pending,
        Accepted,
        Rejected,
        Blocked
    }
}
