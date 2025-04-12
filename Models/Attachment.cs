using System;
using System.ComponentModel.DataAnnotations;

namespace WeChat.Models
{
    public class Attachment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int MessageId { get; set; }

        [Required]
        [StringLength(255)]
        public required string FileName { get; set; }

        [Required]
        [StringLength(500)]
        public required string FilePath { get; set; }

        [Required]
        [StringLength(100)]
        public required string FileType { get; set; }

        [Required]
        public long FileSize { get; set; }

        [Required]
        public DateTime UploadedAt { get; set; }

        // Navigation property
        public required virtual Message Message { get; set; }
    }
}
