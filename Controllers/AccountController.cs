using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;
using WeChat.Data;
using WeChat.Helpers;
using WeChat.Models;
using WeChat.ViewModels;

namespace WeChat.Controllers
{
    public class AccountController : Controller
    {
        private readonly WebChatContext _context;

        public AccountController(WebChatContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            if (ModelState.IsValid)
            {
                // Check if username or email already exists
                if (await _context.Users.AnyAsync(u => u.Username == model.Username || u.Email == model.Email))
                {
                    ModelState.AddModelError("", "Username or Email already exists");

                    // For AJAX requests
                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = false, message = "Username or Email already exists" });
                    }

                    return View(model);
                }

                // Create new user
                var user = new User
                {
                    Username = model.Username,
                    Email = model.Email,
                    Password = PasswordHasher.HashPassword(model.Password),
                    FullName = model.FullName,
                    CreatedDate = DateTime.Now,
                    IsActive = true,
                    Role = UserRole.User // Default role is User
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Auto login after registration
                await SignInUser(user);

                // For AJAX requests, return a success result
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return Json(new { success = true });
                }

                return RedirectToAction("Index", "Home");
            }

            // Fix for ModelState errors in Register method
            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                var errors = ModelState.Where(x => x.Value?.Errors?.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value?.Errors?.Select(e => e.ErrorMessage).ToArray() ?? Array.Empty<string>()
                    );

                return Json(new { success = false, errors = errors });
            }

            return View(model);
        }


        [HttpGet]
        [Authorize]
        public async Task<IActionResult> Profile()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            var userId = int.Parse(userIdClaim.Value);
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound();
            }

            return View(user);
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateProfile([FromForm] UpdateProfileViewModel model)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || int.Parse(userIdClaim.Value) != model.UserId)
                {
                    return Json(new { success = false, message = "Unauthorized" });
                }

                var user = await _context.Users.FindAsync(model.UserId);
                if (user == null)
                {
                    return Json(new { success = false, message = "User not found" });
                }

                // Only update fields that are provided (allowing partial updates)
                if (!string.IsNullOrEmpty(model.FullName))
                {
                    user.FullName = model.FullName;
                }

                if (!string.IsNullOrEmpty(model.Email))
                {
                    user.Email = model.Email;
                }

                // Optional fields can be updated even if null/empty
                user.Department = model.Department;
                user.JobTitle = model.JobTitle;

                // Update password if provided
                if (!string.IsNullOrEmpty(model.Password))
                {
                    user.Password = PasswordHasher.HashPassword(model.Password);
                }

                // Handle profile picture upload
                if (model.ProfilePicture != null && model.ProfilePicture.Length > 0)
                {
                    try
                    {
                        // Create uploads directory if it doesn't exist
                        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "profiles");
                        if (!Directory.Exists(uploadsFolder))
                        {
                            Directory.CreateDirectory(uploadsFolder);
                        }

                        // Generate unique filename for the image
                        var uniqueFileName = Guid.NewGuid().ToString() + "_" + model.ProfilePicture.FileName;
                        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                        // Save the file
                        using (var fileStream = new FileStream(filePath, FileMode.Create))
                        {
                            await model.ProfilePicture.CopyToAsync(fileStream);
                        }

                        // Update the user's profile picture URL
                        user.ProfilePicture = "/uploads/profiles/" + uniqueFileName;
                    }
                    catch (Exception ex)
                    {
                        return Json(new { success = false, message = "File upload error: " + ex.Message });
                    }
                }

                _context.Update(user);
                await _context.SaveChangesAsync();

                // Re-signin the user to update claims
                await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                await SignInUser(user);

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }



        [HttpGet]
        public IActionResult Login(string? returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginViewModel model, string? returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;

            if (ModelState.IsValid)
            {
                // Find user by username/email
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => (u.Username == model.UsernameOrEmail || u.Email == model.UsernameOrEmail) && u.IsActive == true);

                if (user != null && PasswordHasher.VerifyPassword(model.Password, user.Password))
                {
                    // Update last login time
                    user.LastLogin = DateTime.Now;
                    await _context.SaveChangesAsync();

                    // Sign in user
                    await SignInUser(user);

                    // For AJAX requests, return a success result
                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = true });
                    }

                    // Redirect to returnUrl or home page
                    if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
                        return Redirect(returnUrl);
                    else
                        return RedirectToAction("Index", "Home");
                }

                ModelState.AddModelError("", "Invalid login attempt");
            }

            // Fix for ModelState errors in Login method
            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                var errors = ModelState.Where(x => x.Value?.Errors?.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value?.Errors?.Select(e => e.ErrorMessage).ToArray() ?? Array.Empty<string>()
                    );

                return Json(new { success = false, errors = errors, message = "Invalid login attempt" });
            }

            return View(model);
        }


        [HttpPost]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Index", "Home");
        }

        [HttpGet]
        public IActionResult AccessDenied()
        {
            return View();
        }

        private async Task SignInUser(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.GivenName, user.FullName ?? string.Empty),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("UserId", user.UserId.ToString()),
                // Add the ProfilePicture claim
                new Claim("ProfilePicture", user.ProfilePicture ?? "/images/avatars/default-avatar.png")
            };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var authProperties = new AuthenticationProperties
            {
                IsPersistent = true, // Remember me functionality
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(12)
            };

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(claimsIdentity),
                authProperties);
        }

    }
}
