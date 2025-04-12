// Updated UpdateProfileViewModel.cs
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace WeChat.ViewModels
{
    public class UpdateProfileViewModel
    {
        public int UserId { get; set; }

        // Remove Required attribute to allow partial updates
        public string FullName { get; set; } = string.Empty;

        // Remove Required attribute to allow partial updates
        public string Email { get; set; } = string.Empty;

        public string Department { get; set; } = string.Empty;

        public string JobTitle { get; set; } = string.Empty;

        // Current password when changing password
        public string CurrentPassword { get; set; } = string.Empty;

        // New password when changing password
        public string NewPassword { get; set; } = string.Empty;

        // Existing password field (used in AccountController)
        public string Password { get; set; } = string.Empty;

        public IFormFile ProfilePicture { get; set; } = null!;
    }
}
