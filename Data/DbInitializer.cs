using Microsoft.Extensions.Logging;
using WeChat.Helpers;
using WeChat.Models;

namespace WeChat.Data
{
    public static class DbInitializer
    {
        /// <summary>
        /// Initializes the database with seed data if it's empty
        /// </summary>
        /// <param name="context">The database context</param>
        /// <param name="logger">Optional logger for recording operations</param>
        public static void Initialize(WebChatContext context, ILogger? logger = null)
        {
            try
            {
                // Ensure database is created
                context.Database.EnsureCreated();

                // Check if database already contains data
                if (context.Users.Any())
                {
                    LogMessage(logger, LogLevel.Information, "Database already contains data. Skipping initialization.");
                    return; // DB has been seeded
                }

                // Seed all required data
                SeedUsers(context, logger);
                SeedSubscriptionPlans(context, logger);

                LogMessage(logger, LogLevel.Information, "Database initialized successfully");
            }
            catch (Exception ex)
            {
                LogMessage(logger, LogLevel.Error, $"Error initializing database: {ex.Message}");
                LogMessage(logger, LogLevel.Debug, $"Stack trace: {ex.StackTrace}");

                // Re-throw the exception to be handled by the calling method if needed
                throw;
            }
        }

        /// <summary>
        /// Seeds initial user accounts
        /// </summary>
        private static void SeedUsers(WebChatContext context, ILogger? logger)
        {
            LogMessage(logger, LogLevel.Information, "Seeding user accounts...");

            // Create admin user
            var admin = new User
            {
                Username = "admin",
                Email = "admin@example.com",
                Password = PasswordHasher.HashPassword("Admin@123"),
                FullName = "System Administrator",
                CreatedDate = DateTime.Now,
                LastLogin = null,
                IsActive = true,
                Role = UserRole.Admin,
                Department = "IT",
                JobTitle = "System Administrator"
            };

            // Create demo user
            var user = new User
            {
                Username = "user",
                Email = "user@example.com",
                Password = PasswordHasher.HashPassword("User@123"),
                FullName = "Demo User",
                CreatedDate = DateTime.Now,
                LastLogin = null,
                IsActive = true,
                Role = UserRole.User,
                Department = "Marketing",
                JobTitle = "Marketing Specialist"
            };

            // Create test user
            var tester = new User
            {
                Username = "tester",
                Email = "test@example.com",
                Password = PasswordHasher.HashPassword("Test@123"),
                FullName = "Test User",
                CreatedDate = DateTime.Now,
                LastLogin = null,
                IsActive = true,
                Role = UserRole.User,
                Department = "Quality Assurance",
                JobTitle = "QA Tester"
            };

            // Add all users to context
            context.Users.AddRange(admin, user, tester);
            context.SaveChanges();

            LogMessage(logger, LogLevel.Information, $"Created {context.Users.Count()} user accounts");
        }

        /// <summary>
        /// Seeds initial subscription plans
        /// </summary>
        private static void SeedSubscriptionPlans(WebChatContext context, ILogger? logger)
        {
            LogMessage(logger, LogLevel.Information, "Seeding subscription plans...");

            // Get the first user for assigning a subscription
            var user = context.Users.FirstOrDefault(u => u.Role == UserRole.User);
            if (user != null)
            {
                // Create a sample active subscription
                var activeSubscription = new Subscription
                {
                    UserId = user.UserId,
                    PlanName = "Premium",
                    StartDate = DateTime.Now,
                    EndDate = DateTime.Now.AddYears(1),
                    Price = 99.99m,
                    IsActive = true,
                    PaymentStatus = "Paid",
                    CreatedAt = DateTime.Now
                };

                context.Subscriptions.Add(activeSubscription);
                context.SaveChanges();

                LogMessage(logger, LogLevel.Information, "Created sample subscription data");
            }
        }

        /// <summary>
        /// Helper method for logging messages with proper level
        /// </summary>
        private static void LogMessage(ILogger? logger, LogLevel level, string message)
        {
            if (logger != null)
            {
                logger.Log(level, message);
            }
            else
            {
                // If no logger is provided, fallback to console
                Console.WriteLine($"[{level}] {message}");
            }
        }
    }
}
