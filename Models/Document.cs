using System;
using System.Collections.Generic;

namespace WeChat.Models;

public partial class Document
{
    public int DocumentId { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public string FilePath { get; set; } = null!;

    public int? FileSize { get; set; }

    public string? FileType { get; set; }

    public int UploadedBy { get; set; }

    public DateTime? UploadDate { get; set; }

    public bool? IsPublic { get; set; }

    public virtual User UploadedByNavigation { get; set; } = null!;
}
