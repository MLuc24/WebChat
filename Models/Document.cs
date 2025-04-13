using System;
using System.ComponentModel.DataAnnotations;

namespace WeChat.Models;

public partial class Document
{
    public int DocumentId { get; set; }

    [Required(ErrorMessage = "Title is required")]
    [StringLength(100, ErrorMessage = "Title cannot exceed 100 characters")]
    public string Title { get; set; } = null!;

    [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Category is required")]
    [StringLength(50, ErrorMessage = "Category cannot exceed 50 characters")]
    public string Category { get; set; } = null!;

    public int UploadedBy { get; set; }

    public DateTime UploadDate { get; set; } = DateTime.Now;

    public bool IsPublic { get; set; } = true;

    public virtual User UploadedByNavigation { get; set; } = null!;
}
