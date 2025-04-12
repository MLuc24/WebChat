using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using WeChat.Data;
using WeChat.Models;

namespace WeChat.Controllers
{
    public class SubscriptionController : Controller
    {
        private readonly WebChatContext _context;
        private readonly ILogger<SubscriptionController> _logger;

        public SubscriptionController(WebChatContext context, ILogger<SubscriptionController> logger)
        {
            _context = context;
            _logger = logger;
        }

        #region Admin Section (Requires Admin Role)

        // GET: Subscription/Index (Admin Dashboard)
        [Authorize(Roles = "Admin")]
        public IActionResult Index()
        {
            try
            {
                if (_context.Users != null)
                {
                    ViewBag.Users = new SelectList(_context.Users.OrderBy(u => u.FullName), "UserId", "FullName");
                }
                else
                {
                    _logger.LogWarning("Users DbSet is null in Subscription/Index");
                    ViewBag.Users = new SelectList(Enumerable.Empty<SelectListItem>());
                }
                return View();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Subscription/Index");
                ViewBag.ErrorMessage = "Đã xảy ra lỗi khi tải trang quản lý gói đăng ký.";
                return View();
            }
        }


        // GET: All subscriptions as JSON for the admin dashboard
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAllSubscriptions()
        {
            try
            {
                var subscriptions = await _context.Subscriptions
                .Include(s => s.User)
                .OrderByDescending(s => s.EndDate)
                .Select(s => new
                {
                    s.SubscriptionId,
                    s.UserId,
                    s.PlanName,
                    s.StartDate,
                    s.EndDate,
                    s.Price,
                    s.PaymentStatus,
                    s.IsActive,
                    CreatedDate = s.CreatedAt,
                    User = s.User != null ? new
                    {
                        s.User.UserId,
                        s.User.Username,
                        s.User.FullName,
                        s.User.Email
                    } : null
                })
                .ToListAsync();


                return Json(subscriptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAllSubscriptions");
                return Json(new { error = "Không thể tải dữ liệu đăng ký. Vui lòng thử lại sau." });
            }
        }

        // GET: Get subscription details by ID for current user
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetSubscription(int id)
        {
            try
            {
                // Get current user ID
                var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!int.TryParse(userIdValue, out int currentUserId))
                {
                    throw new InvalidOperationException("User ID is not valid.");
                }

                var subscription = await _context.Subscriptions
                    .Include(s => s.User)
                    .FirstOrDefaultAsync(s => s.SubscriptionId == id);

                if (subscription == null)
                {
                    return NotFound(new { message = "Không tìm thấy gói đăng ký" });
                }

                // If user is not admin and not the owner of the subscription, return forbidden
                if (!User.IsInRole("Admin") && subscription.UserId != currentUserId)
                {
                    return Forbid();
                }

                // Check if User is null before accessing its properties
                var userData = subscription.User != null
                    ? new
                    {
                        subscription.User.UserId,
                        subscription.User.Username,
                        subscription.User.FullName,
                        subscription.User.Email
                    }
                    : null;

                return Json(new
                {
                    subscription.SubscriptionId,
                    subscription.UserId,
                    subscription.PlanName,
                    subscription.StartDate,
                    subscription.EndDate,
                    subscription.Price,
                    subscription.PaymentStatus,
                    subscription.IsActive,
                    CreatedDate = subscription.CreatedAt,
                    User = userData
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSubscription {SubscriptionId}", id);
                return StatusCode(500, new { error = "Đã xảy ra lỗi khi tải thông tin chi tiết gói đăng ký" });
            }
        }

        // POST: Create a new subscription (Admin)
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([FromBody] SubscriptionInputModel model)
        {
            try
            {
                _logger.LogInformation("Create subscription request received: {Model}", model);

                // Fix ModelState null references (lines 155-156, 161-162)
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("Invalid model state: {@ModelErrors}",
                        ModelState.Where(m => m.Value?.Errors?.Count > 0)
                            .Select(m => new { Key = m.Key, Errors = m.Value?.Errors?.Select(e => e.ErrorMessage).ToArray() ?? Array.Empty<string>() }));

                    return Json(new
                    {
                        success = false,
                        errors = ModelState.Where(x => x.Value?.Errors?.Count > 0)
                        .ToDictionary(k => k.Key, v => v.Value?.Errors?.Select(e => e.ErrorMessage).ToArray() ?? Array.Empty<string>())
                    });
                }

                // Create a new subscription entity and set its properties
                var subscription = new Subscription
                {
                    UserId = model.UserId,
                    PlanName = model.PlanName,
                    StartDate = model.StartDate,
                    EndDate = model.EndDate,
                    Price = model.Price,
                    PaymentStatus = model.PaymentStatus,
                    IsActive = model.IsActive,
                    CreatedAt = DateTime.Now
                };

                _context.Add(subscription);
                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Gói đăng ký đã được tạo thành công", subscriptionId = subscription.SubscriptionId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating subscription: {Message}", ex.Message);
                return Json(new { success = false, message = "Lỗi khi tạo gói đăng ký: " + ex.Message });
            }
        }


        // POST: Edit subscription (Admin)
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, [FromBody] SubscriptionInputModel model)
        {
            if (id != model.SubscriptionId)
            {
                return Json(new { success = false, message = "ID không khớp" });
            }

            try
            {
                if (ModelState.IsValid)
                {
                    // Get the existing subscription
                    var existingSubscription = await _context.Subscriptions
                        .AsNoTracking()
                        .FirstOrDefaultAsync(s => s.SubscriptionId == id);

                    if (existingSubscription == null)
                    {
                        return Json(new { success = false, message = "Không tìm thấy gói đăng ký" });
                    }

                    // Update with new values
                    var subscription = new Subscription
                    {
                        SubscriptionId = model.SubscriptionId,
                        UserId = model.UserId,
                        PlanName = model.PlanName,
                        StartDate = model.StartDate,
                        EndDate = model.EndDate,
                        Price = model.Price,
                        PaymentStatus = model.PaymentStatus,
                        IsActive = model.IsActive,
                        CreatedAt = existingSubscription.CreatedAt
                    };

                    _context.Update(subscription);
                    await _context.SaveChangesAsync();

                    return Json(new { success = true, message = "Cập nhật thành công", subscriptionId = subscription.SubscriptionId });
                }
                else
                {
                    // Fix ModelState null references (lines 239, 242)
                    // Return validation errors
                    var errors = ModelState.Where(x => x.Value?.Errors?.Count > 0)
                        .ToDictionary(
                            k => k.Key,
                            v => v.Value?.Errors?.Select(e => e.ErrorMessage).ToArray() ?? Array.Empty<string>()
                        );


                    return Json(new { success = false, errors = errors });
                }
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SubscriptionExists(model.SubscriptionId))
                {
                    return Json(new { success = false, message = "Không tìm thấy gói đăng ký" });
                }
                else
                {
                    return Json(new { success = false, message = "Lỗi cập nhật dữ liệu, vui lòng thử lại" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating subscription {SubscriptionId}: {Message}", id, ex.Message);
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // POST: Delete subscription (Admin)
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var subscription = await _context.Subscriptions.FindAsync(id);
                if (subscription == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy gói đăng ký" });
                }

                _context.Subscriptions.Remove(subscription);
                await _context.SaveChangesAsync();
                return Json(new { success = true, message = "Đã xóa gói đăng ký thành công" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting subscription {SubscriptionId}: {Message}", id, ex.Message);
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        // POST: Toggle subscription active status
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> ToggleActive(int id, [FromBody] ToggleActiveViewModel model)
        {
            try
            {
                var subscription = await _context.Subscriptions.FindAsync(id);
                if (subscription == null)
                {
                    return NotFound(new { message = "Không tìm thấy gói đăng ký" });
                }

                subscription.IsActive = model.IsActive;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = $"Đã {(model.IsActive ? "kích hoạt" : "vô hiệu hóa")} gói đăng ký" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling subscription {SubscriptionId} active status: {Message}", id, ex.Message);
                return StatusCode(500, new { error = "Đã xảy ra lỗi khi cập nhật trạng thái gói đăng ký" });
            }
        }

        // GET: Get subscription stats for dashboard
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var now = DateTime.Now;
                var expiringDate = now.AddDays(7); // Consider subscriptions expiring within 7 days as "expiring soon"

                var total = await _context.Subscriptions.CountAsync();
                var active = await _context.Subscriptions.CountAsync(s => s.IsActive == true && s.EndDate > now);
                var expiring = await _context.Subscriptions.CountAsync(s => s.IsActive == true && s.EndDate > now && s.EndDate <= expiringDate);
                var expired = await _context.Subscriptions.CountAsync(s => s.EndDate < now);

                return Json(new
                {
                    success = true,
                    total,
                    active,
                    expiring,
                    expired
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting subscription stats: {Message}", ex.Message);
                return Json(new { success = false, message = "Không thể tải thống kê. Vui lòng thử lại sau." });
            }
        }

        #endregion

        #region User Section (Available to authenticated users)

        // GET: Subscription/MySubscriptions - View for users to see their own subscriptions
        [Authorize]
        public async Task<IActionResult> MySubscriptions()
        {
            try
            {
                var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userIdValue))
                {
                    throw new InvalidOperationException("User ID not found.");
                }
                int currentUserId = int.Parse(userIdValue);


                var subscriptions = await _context.Subscriptions
                    .Where(s => s.UserId == currentUserId)
                    .OrderByDescending(s => s.EndDate)
                    .ToListAsync();

                // Get available plans for new subscriptions
                ViewBag.AvailablePlans = await GetAvailablePlans();

                // Pass the model to the view to fix loading issues
                return View("~/Views/Users/MySubscriptions.cshtml", subscriptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading MySubscriptions: {Message}", ex.Message);

                // Add debugging information to ViewBag
                ViewBag.ErrorMessage = ex.Message;
                ViewBag.StackTrace = ex.StackTrace;
                ViewBag.AvailablePlans = await GetAvailablePlans();

                // Return with empty model but with error information
                return View("~/Views/Users/MySubscriptions.cshtml", new List<Subscription>());
            }
        }

        // GET: Get user's active subscription status
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetMySubscriptionStatus()
        {
            try
            {
                var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userIdValue))
                {
                    throw new InvalidOperationException("User ID not found.");
                }
                int currentUserId = int.Parse(userIdValue);


                var activeSubscription = await _context.Subscriptions
                    .Where(s => s.UserId == currentUserId &&
                                s.IsActive == true &&
                                s.EndDate > DateTime.Now)
                    .OrderByDescending(s => s.EndDate)
                    .FirstOrDefaultAsync();

                bool hasActiveSubscription = activeSubscription != null;

                // Fix null reference in activeSubscription (line 408)
                return Json(new
                {
                    success = true,
                    hasActiveSubscription,
                    subscription = hasActiveSubscription ? new
                    {
                        PlanName = activeSubscription!.PlanName,
                        EndDate = activeSubscription.EndDate,
                        DaysRemaining = (activeSubscription.EndDate - DateTime.Now).Days
                    } : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetMySubscriptionStatus: {Message}", ex.Message);
                return Json(new
                {
                    success = false,
                    message = "Không thể tải thông tin gói đăng ký. Vui lòng thử lại sau."
                });
            }
        }


        // GET: Subscription/Plans - View available subscription plans
        [Authorize]
        public async Task<IActionResult> Plans()
        {
            try
            {
                // Get available plans
                var plans = await GetAvailablePlans();
                return View("~/Views/Users/Plans.cshtml", plans);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Plans: {Message}", ex.Message);
                ViewBag.ErrorMessage = "Không thể tải danh sách các gói đăng ký";
                return View("~/Views/Users/Plans.cshtml", new List<PlanViewModel>());
            }
        }

        // POST: Subscribe to a plan (for regular users)
        [Authorize]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Subscribe(UserSubscriptionViewModel model)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList();

                    return Json(new { success = false, message = "Dữ liệu không hợp lệ", errors });
                }

                var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userIdValue))
                {
                    throw new InvalidOperationException("User ID not found.");
                }
                int currentUserId = int.Parse(userIdValue);


                // Calculate correct price based on duration
                decimal basePrice = model.Price;
                int duration = model.DurationMonths;
                decimal discount = 0;

                // Apply discounts for longer subscriptions
                if (duration == 3) discount = 0.05m;      // 5% discount for 3 months
                else if (duration == 6) discount = 0.10m; // 10% discount for 6 months
                else if (duration == 12) discount = 0.15m; // 15% discount for 12 months

                // Calculate total price for the entire subscription period
                decimal totalPrice = basePrice * duration * (1 - discount);

                // Create the new subscription
                var subscription = new Subscription
                {
                    UserId = currentUserId,
                    PlanName = model.PlanName,
                    StartDate = DateTime.Now,
                    EndDate = DateTime.Now.AddMonths(model.DurationMonths),
                    // Store the total price for the entire period
                    Price = totalPrice,
                    PaymentStatus = "Pending", // Start with pending status
                    IsActive = false, // Will be activated after payment
                    CreatedAt = DateTime.Now
                };

                _context.Subscriptions.Add(subscription);
                await _context.SaveChangesAsync();

                // In a real application, redirect to payment gateway here
                // For demo purposes, we'll simulate successful payment

                // Simulate payment completion
                subscription.PaymentStatus = "Paid";
                subscription.IsActive = true;
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = "Đăng ký thành công!",
                    subscriptionId = subscription.SubscriptionId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Subscribe: {Message}", ex.Message);
                return Json(new { success = false, message = "Lỗi: " + ex.Message });
            }
        }

        #endregion

        #region Shared Methods

        // GET: User subscriptions for a specific user
        [AllowAnonymous]
        public async Task<IActionResult> UserSubscriptions(int userId)
        {
            try
            {
                var subscriptions = await _context.Subscriptions
     .Where(s => s.UserId == userId && s.IsActive == true && s.EndDate >= DateTime.Now)
     .OrderByDescending(s => s.EndDate)
     .ToListAsync();

                return Json(new { success = true, subscriptions });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UserSubscriptions for userId {UserId}: {Message}", userId, ex.Message);
                return Json(new { success = false, message = "Không thể tải dữ liệu đăng ký người dùng" });
            }
        }

        // Helper method to get available plans
        private async Task<List<PlanViewModel>> GetAvailablePlans()
        {
            // In a real app, you might fetch this from a database
            var plans = new List<PlanViewModel>
            {
                new PlanViewModel
                {
                    Id = "Basic",
                    Name = "Cơ bản",
                    Description = "Gói cơ bản với các tính năng thiết yếu",
                    PriceMonthly = 9.99m,
                    Features = new List<string>
                    {
                        "Nhắn tin không giới hạn",
                        "Tối đa 5 sự kiện mỗi tháng",
                        "Lưu trữ 1GB"
                    }
                },
                new PlanViewModel
                {
                    Id = "Standard",
                    Name = "Tiêu chuẩn",
                    Description = "Gói tiêu chuẩn với nhiều tính năng hơn",
                    PriceMonthly = 19.99m,
                    Features = new List<string>
                    {
                        "Tất cả tính năng của gói Cơ bản",
                        "Tạo nhóm chat với 20 thành viên",
                        "Tối đa 15 sự kiện mỗi tháng",
                        "Lưu trữ 5GB"
                    }
                },
                new PlanViewModel
                {
                    Id = "Premium",
                    Name = "Cao cấp",
                    Description = "Gói cao cấp với đầy đủ tính năng",
                    PriceMonthly = 29.99m,
                    Features = new List<string>
                    {
                        "Tất cả tính năng của gói Tiêu chuẩn",
                        "Tạo nhóm chat không giới hạn thành viên",
                        "Sự kiện và lịch không giới hạn",
                        "Lưu trữ 20GB",
                        "Hỗ trợ 24/7"
                    }
                },
                new PlanViewModel
                {
                    Id = "Enterprise",
                    Name = "Doanh nghiệp",
                    Description = "Giải pháp toàn diện cho doanh nghiệp",
                    PriceMonthly = 99.99m,
                    Features = new List<string>
                    {
                        "Tất cả tính năng của gói Cao cấp",
                        "Tích hợp API tùy chỉnh",
                        "Quản lý người dùng nâng cao",
                        "Lưu trữ không giới hạn",
                        "Bảo mật nâng cao và kiểm soát quyền truy cập",
                        "Quản lý đội ngũ chuyên dụng"
                    }
                }
            };

            return await Task.FromResult(plans);
        }

        // Check if a subscription exists
        private bool SubscriptionExists(int id)
        {
            return _context.Subscriptions.Any(e => e.SubscriptionId == id);
        }

        [HttpPost]
        [Route("Subscription/TestCreate")]
        public IActionResult TestCreate([FromBody] object data)
        {
            try
            {
                _logger.LogInformation("Test create received data: {@Data}", data);
                return Json(new { success = true, message = "Test received", data = data });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in test create");
                return Json(new { success = false, message = ex.Message });
            }
        }

        #endregion
    }

    #region ViewModels
    public class ToggleActiveViewModel
    {
        public bool IsActive { get; set; }
    }

    public class UserSubscriptionViewModel
    {
        public string PlanName { get; set; } = string.Empty;
        public int DurationMonths { get; set; }
        public decimal Price { get; set; }
    }

    public class PlanViewModel
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal PriceMonthly { get; set; }
        public List<string> Features { get; set; } = new List<string>();
    }
    // Add this class to SubcriptionController.cs
    public class SubscriptionInputModel
    {
        public int SubscriptionId { get; set; }
        public int UserId { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Price { get; set; }
        public string PaymentStatus { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
    #endregion
}
