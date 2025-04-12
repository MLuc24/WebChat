using System;
using System.ComponentModel.DataAnnotations;

namespace WeChat.Models
{
    public class Conversation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int User1Id { get; set; }

        [Required]
        public int User2Id { get; set; }

        [Required]
        public DateTime LastActivity { get; set; }

        public int UnreadCountUser1 { get; set; }

        public int UnreadCountUser2 { get; set; }

        // Navigation properties
        public virtual User? User1 { get; set; }

        public virtual User? User2 { get; set; }

        // Helper methods
        public User? GetOtherUser(int userId)
        {
            return userId == User1Id ? User2 : User1;
        }

        public int GetUnreadCount(int userId)
        {
            return userId == User1Id ? UnreadCountUser1 : UnreadCountUser2;
        }

        public void MarkAsRead(int userId)
        {
            if (userId == User1Id)
                UnreadCountUser1 = 0;
            else
                UnreadCountUser2 = 0;
        }

        public void IncreaseUnreadCount(int userId)
        {
            if (userId == User1Id)
                UnreadCountUser1++;
            else
                UnreadCountUser2++;
        }
    }
}
