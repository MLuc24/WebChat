using WeChat.Models;

public partial class User
{
    public int UserId { get; set; }
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? ProfilePicture { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public DateTime? CreatedDate { get; set; }
    public DateTime? LastLogin { get; set; }
    public bool? IsActive { get; set; }
    public UserRole Role { get; set; } = UserRole.User;

    public virtual ICollection<Document> Documents { get; set; } = new List<Document>();
    public virtual ICollection<Event> Events { get; set; } = new List<Event>();
    public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

    // Loại bỏ các dòng sau nếu có:
    // public virtual ICollection<Message> MessageReceivers { get; set; } = new List<Message>();
    // public virtual ICollection<Message> MessageSenders { get; set; } = new List<Message>();
}
