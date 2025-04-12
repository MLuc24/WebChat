using System;
using System.Collections.Generic;

namespace WeChat.Models;

public partial class Event
{
    public int EventId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public string? Location { get; set; }

    public int CreatedBy { get; set; }

    public DateTime? CreatedDate { get; set; }

    public bool? IsAllDay { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;
}
