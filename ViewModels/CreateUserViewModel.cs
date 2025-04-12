// ViewModels/CreateUserViewModel.cs
using System.ComponentModel.DataAnnotations;

public class CreateUserViewModel
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string FullName { get; set; } = string.Empty;

    public string? Department { get; set; }

    public string? JobTitle { get; set; }

    public bool IsActive { get; set; } = true;

    public IFormFile? ProfilePicture { get; set; }
}