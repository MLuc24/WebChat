using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using WeChat.Data;
using WeChat.Models;
using WeChat.ViewModels;

namespace WeChat.Controllers
{
    public class UserController : Controller
    {
        private readonly WebChatContext _context;

        public UserController(WebChatContext context)
        {
            _context = context;
        }

        // GET: User (Admin view of all users)
        [Authorize(Roles = "Admin")]
        public IActionResult Index()
        {
            return View("~/Views/Users/Index.cshtml");
        }

        // GET: User/GetUsers (Admin data endpoint)
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            // Only get regular users, not admins
            var users = await _context.Users
                .Where(u => u.Role != UserRole.Admin) // Exclude admins
                .Select(u => new {
                    u.UserId,
                    u.Username,
                    u.Email,
                    u.FullName,
                    u.Department,
                    u.JobTitle,
                    u.CreatedDate,
                    u.LastLogin,
                    u.IsActive,
                    u.ProfilePicture,
                    Role = u.Role.ToString()
                }).ToListAsync();

            return Json(users);
        }

        // GET: User/Details/5 (Admin endpoint)
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetUserDetails(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            // Check if user is admin, prevent accessing admin details
            if (user.Role == UserRole.Admin)
            {
                return Json(new { success = false, message = "Admin accounts cannot be managed through this interface." });
            }

            return Json(new
            {
                user.UserId,
                user.Username,
                user.Email,
                user.FullName,
                user.ProfilePicture,
                user.Department,
                user.JobTitle,
                user.CreatedDate,
                user.LastLogin,
                user.IsActive,
                Role = user.Role.ToString()
            });
        }

        // GET: User/GetCurrentUserDetails
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetCurrentUserDetails()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized(new { success = false, message = "User is not properly authenticated" });
            }

            int currentUserId = int.Parse(userIdClaim);
            var user = await _context.Users.FindAsync(currentUserId);

            if (user == null)
            {
                return Json(new { success = false, message = "Current user not found" });
            }

            return Json(new
            {
                success = true,
                userId = user.UserId,
                username = user.Username,
                email = user.Email,
                fullName = user.FullName,
                profilePicture = user.ProfilePicture,
                department = user.Department,
                jobTitle = user.JobTitle,
                createdDate = user.CreatedDate,
                lastLogin = user.LastLogin,
                isActive = user.IsActive,
                role = user.Role.ToString()
            });
        }

        // POST: User/Create (Admin endpoint)
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([FromForm] CreateUserViewModel userModel)
        {
            if (ModelState.IsValid)
            {
                // Create new user entity
                var user = new User
                {
                    Username = userModel.Username,
                    Email = userModel.Email,
                    FullName = userModel.FullName,
                    Department = userModel.Department,
                    JobTitle = userModel.JobTitle,
                    Role = UserRole.User, // Ensure that new users can only be created as regular users, not admins
                    Password = Helpers.PasswordHasher.HashPassword(userModel.Password),
                    CreatedDate = DateTime.Now,
                    IsActive = true,
                    // Default profile picture
                    ProfilePicture = "/images/avatars/default-avatar.png"
                };

                // Handle profile picture upload if provided
                if (userModel.ProfilePicture != null && userModel.ProfilePicture.Length > 0)
                {
                    string profilePicturePath = await SaveProfilePicture(userModel.ProfilePicture);
                    if (!string.IsNullOrEmpty(profilePicturePath))
                    {
                        user.ProfilePicture = profilePicturePath;
                    }
                }

                _context.Add(user);
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    user = new
                    {
                        user.UserId,
                        user.Username,
                        user.Email,
                        user.FullName,
                        user.Department,
                        user.JobTitle,
                        user.ProfilePicture,
                        user.IsActive,
                        Role = user.Role.ToString()
                    }
                });
            }
            return Json(new { success = false, errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });
        }

        // PUT: User/Update/5 (Admin endpoint)
        [Authorize(Roles = "Admin")]
        [HttpPut]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Update(int id, [FromForm] UpdateUserViewModel user)
        {
            if (id != user.UserId)
            {
                return BadRequest();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    var existingUser = await _context.Users.FindAsync(id);
                    if (existingUser == null)
                    {
                        return NotFound();
                    }

                    // Check if the user we're trying to edit is an admin - if so, prevent editing
                    if (existingUser.Role == UserRole.Admin)
                    {
                        return Json(new { success = false, message = "Cannot modify admin accounts through this interface." });
                    }

                    // Update only allowed fields
                    existingUser.Username = user.Username;
                    existingUser.Email = user.Email;
                    existingUser.FullName = user.FullName;
                    existingUser.Department = user.Department;
                    existingUser.JobTitle = user.JobTitle;
                    existingUser.IsActive = user.IsActive;

                    // Keep the user as a regular user, not an admin
                    existingUser.Role = UserRole.User;

                    // Only update password if provided
                    // If Password is null or empty, keep the existing password
                    if (!string.IsNullOrEmpty(user.Password))
                    {
                        existingUser.Password = Helpers.PasswordHasher.HashPassword(user.Password);
                    }
                    // else: Do nothing - keep the existing password

                    // Handle profile picture upload if provided
                    if (user.ProfilePicture != null && user.ProfilePicture.Length > 0)
                    {
                        string newProfilePicturePath = await SaveProfilePicture(user.ProfilePicture);
                        if (!string.IsNullOrEmpty(newProfilePicturePath))
                        {
                            // Delete old profile picture if it exists and is not the default
                            if (!string.IsNullOrEmpty(existingUser.ProfilePicture) &&
                                !existingUser.ProfilePicture.Contains("default-avatar"))
                            {
                                DeleteProfilePicture(existingUser.ProfilePicture);
                            }
                            existingUser.ProfilePicture = newProfilePicturePath;
                        }
                    }

                    _context.Update(existingUser);
                    await _context.SaveChangesAsync();

                    // If the user being updated is the current user, refresh their claims
                    var currentUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (currentUserIdClaim != null && int.Parse(currentUserIdClaim) == existingUser.UserId)
                    {
                        await RefreshUserClaims(existingUser);
                    }

                    return Json(new
                    {
                        success = true,
                        message = "User updated successfully.",
                        profilePicture = existingUser.ProfilePicture ?? "/images/avatars/default-avatar.png"
                    });
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!UserExists(id))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
            }
            return Json(new { success = false, errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });
        }

        // GET: User/GetInactiveUsers (Admin data endpoint)
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetInactiveUsers()
        {
            var inactiveUsers = await _context.Users
                .Where(u => u.Role != UserRole.Admin && u.IsActive == false)
                .Select(u => new {
                    u.UserId,
                    u.Username,
                    u.Email,
                    u.FullName,
                    u.Department,
                    u.JobTitle,
                    u.CreatedDate,
                    u.LastLogin,
                    u.ProfilePicture,
                    Role = u.Role.ToString()
                }).ToListAsync();

            return Json(inactiveUsers);
        }



        // DELETE: User/Delete/5 (Admin endpoint)
        [Authorize(Roles = "Admin")]
        [HttpDelete]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            // Prevent deletion of admin accounts
            if (user.Role == UserRole.Admin)
            {
                return Json(new { success = false, message = "Cannot delete admin accounts through this interface." });
            }

            try
            {
                // Instead of deleting, set IsActive to false (soft delete)
                user.IsActive = false;
                _context.Update(user);
                await _context.SaveChangesAsync();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // POST: User/Reactivate/5 (Admin endpoint)
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Reactivate(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            // Prevent modification of admin accounts
            if (user.Role == UserRole.Admin)
            {
                return Json(new { success = false, message = "Cannot modify admin accounts through this interface." });
            }

            try
            {
                // Reactivate the user account
                if (user.IsActive != true)
                {
                    user.IsActive = true;
                    _context.Update(user);
                    await _context.SaveChangesAsync();
                    return Json(new { success = true, message = "User account reactivated successfully." });
                }
                else
                {
                    return Json(new { success = false, message = "User account is already active." });
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Error reactivating user: {ex.Message}" });
            }
        }


        // GET: User/Plans - Display available subscription plans
        // In UserController.cs
        [Authorize]
        public IActionResult Plans()
        {
            return RedirectToAction("Plans", "Subscription");
        }


        // Fix for line 248 in MySubscriptions method
        [Authorize]
        public async Task<IActionResult> MySubscriptions()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            int currentUserId = int.Parse(userIdClaim);

            var subscriptions = await _context.Subscriptions
                .Where(s => s.UserId == currentUserId)
                .OrderByDescending(s => s.EndDate)
                .ToListAsync();

            return View("~/Views/Users/MySubscriptions.cshtml", subscriptions);
        }

        [Authorize]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateProfile(UpdateProfileViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View("~/Views/Account/Profile.cshtml", model);
            }

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            int currentUserId = int.Parse(userIdClaim);
            var user = await _context.Users.FindAsync(currentUserId);

            if (user == null)
            {
                return NotFound();
            }

            // Update user profile fields
            user.FullName = model.FullName;
            user.Email = model.Email;
            user.Department = model.Department;
            user.JobTitle = model.JobTitle;

            // Update password if provided
            if (!string.IsNullOrEmpty(model.Password))
            {
                // Since we don't have CurrentPassword in the model, we can't verify it
                // You may want to add extra security here, like requiring re-authentication
                user.Password = Helpers.PasswordHasher.HashPassword(model.Password);
            }

            // Handle profile picture upload if provided
            if (model.ProfilePicture != null && model.ProfilePicture.Length > 0)
            {
                string newProfilePicturePath = await SaveProfilePicture(model.ProfilePicture);
                if (!string.IsNullOrEmpty(newProfilePicturePath))
                {
                    // Delete old profile picture if it exists and is not the default
                    if (!string.IsNullOrEmpty(user.ProfilePicture) &&
                        !user.ProfilePicture.Contains("default-avatar"))
                    {
                        DeleteProfilePicture(user.ProfilePicture);
                    }
                    user.ProfilePicture = newProfilePicturePath;
                }
                else
                {
                    ModelState.AddModelError(string.Empty, "Invalid profile picture. Please upload a valid image file (jpg, png, gif) under 5MB.");
                    return View("~/Views/Account/Profile.cshtml", model);
                }
            }

            try
            {
                _context.Update(user);
                await _context.SaveChangesAsync();

                // Refresh the user claims to update the ProfilePicture claim
                await RefreshUserClaims(user);

                TempData["SuccessMessage"] = "Your profile has been updated successfully!";
                return RedirectToAction("Profile", "Account");
            }
            catch (Exception ex)
            {
                ModelState.AddModelError(string.Empty, $"Error updating profile: {ex.Message}");
                return View("~/Views/Account/Profile.cshtml", model);
            }
        }

        // Helper method to save profile picture
        private async Task<string> SaveProfilePicture(IFormFile profilePicture)
        {
            try
            {
                // Validate file type
                string[] permittedExtensions = { ".jpg", ".jpeg", ".png", ".gif" };
                var ext = Path.GetExtension(profilePicture.FileName).ToLowerInvariant();

                if (string.IsNullOrEmpty(ext) || !permittedExtensions.Contains(ext))
                {
                    return null; // Invalid file type
                }

                // Validate file size (max 5MB)
                if (profilePicture.Length > 5 * 1024 * 1024)
                {
                    return null; // File too large
                }

                // Create uploads directory if it doesn't exist
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "profiles");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                // Generate unique filename for the image
                var uniqueFileName = Guid.NewGuid().ToString() + "_" + profilePicture.FileName;
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                // Save the file
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await profilePicture.CopyToAsync(fileStream);
                }

                // Return the relative URL for the profile picture
                return "/uploads/profiles/" + uniqueFileName;
            }
            catch
            {
                return null;
            }
        }

        // Helper method to delete profile picture
        private void DeleteProfilePicture(string profilePicturePath)
        {
            try
            {
                if (string.IsNullOrEmpty(profilePicturePath))
                    return;

                // Get the physical path of the file
                string filePath = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    profilePicturePath.TrimStart('/')
                );

                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }
            catch
            {
                // Log error or handle exception as needed
            }
        }

        // Helper method to refresh user claims
        private async Task RefreshUserClaims(User user)
        {
            // Sign out the current user
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // Create claims for the user with the updated profile picture
            var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
        new Claim(ClaimTypes.Name, user.Username),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.GivenName, user.FullName ?? string.Empty),
        new Claim(ClaimTypes.Role, user.Role.ToString()),
        new Claim("UserId", user.UserId.ToString()),
        // Make sure to include the ProfilePicture claim with the updated value
        new Claim("ProfilePicture", user.ProfilePicture ?? "/images/avatars/default-avatar.png")
    };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var authProperties = new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(12)
            };

            // Sign in the user with updated claims
            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(claimsIdentity),
                authProperties);
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.UserId == id);
        }
    }
}
