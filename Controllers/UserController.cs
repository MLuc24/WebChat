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
        public async Task<IActionResult> Create([FromBody] User user)
        {
            if (ModelState.IsValid)
            {
                // Ensure that new users can only be created as regular users, not admins
                user.Role = UserRole.User;

                // Hash the password
                user.Password = Helpers.PasswordHasher.HashPassword(user.Password);
                user.CreatedDate = DateTime.Now;
                user.IsActive = true;
                _context.Add(user);
                await _context.SaveChangesAsync();
                return Json(new { success = true, user });
            }
            return Json(new { success = false, errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });
        }

        // PUT: User/Update/5 (Admin endpoint)
        [Authorize(Roles = "Admin")]
        [HttpPut]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Update(int id, [FromBody] User user)
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
                    if (!string.IsNullOrEmpty(user.Password))
                    {
                        existingUser.Password = Helpers.PasswordHasher.HashPassword(user.Password);
                    }

                    _context.Update(existingUser);
                    await _context.SaveChangesAsync();
                    return Json(new { success = true });
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


        // POST: User/UpdateProfile - Update user profile
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
            if (model.ProfilePicture != null)
            {
                // Logic to save profile picture goes here
                // For example:
                var fileName = $"{currentUserId}_{DateTime.Now.Ticks}{Path.GetExtension(model.ProfilePicture.FileName)}";
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images/profiles", fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await model.ProfilePicture.CopyToAsync(stream);
                }

                user.ProfilePicture = $"/images/profiles/{fileName}";
            }

            try
            {
                _context.Update(user);
                await _context.SaveChangesAsync();

                // Update authentication cookie with new user data if needed

                TempData["SuccessMessage"] = "Your profile has been updated successfully!";
                return RedirectToAction("Profile", "Account");
            }
            catch (Exception ex)
            {
                ModelState.AddModelError(string.Empty, $"Error updating profile: {ex.Message}");
                return View("~/Views/Account/Profile.cshtml", model);
            }
        }


        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.UserId == id);
        }
    }
}
