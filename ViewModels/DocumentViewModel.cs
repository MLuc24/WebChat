using System;

namespace WeChat.ViewModels;

public class DocumentViewModel
{
    public int DocumentId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string Category { get; set; } = null!;
    public string UploadedBy { get; set; } = null!;
    public DateTime UploadDate { get; set; }
    public bool IsPublic { get; set; }
}

public class CreateDocumentViewModel
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string Category { get; set; } = null!;
    public bool IsPublic { get; set; } = true;
}
