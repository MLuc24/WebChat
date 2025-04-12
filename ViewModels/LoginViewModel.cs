using System.ComponentModel.DataAnnotations;

namespace WeChat.ViewModels
{
    public class LoginViewModel
    {
        public string UsernameOrEmail { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        [Display(Name = "Remember me")]
        public bool RememberMe { get; set; }
    }
}
