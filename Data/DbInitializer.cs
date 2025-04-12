using WeChat.Helpers;
using WeChat.Models;

namespace WeChat.Data
{
    public static class DbInitializer
    {
        public static void Initialize(WebChatContext context)
        {
            try
            {
                // Make sure the database exists
                context.Database.EnsureCreated();

                // Look for any users
                if (context.Users.Any())
                {
                    return;   // DB has been seeded
                }

                // Create admin user
                var admin = new User
                {
                    Username = "admin",
                    Email = "admin@example.com",
                    Password = PasswordHasher.HashPassword("Admin@123"),
                    FullName = "Administrator",
                    CreatedDate = DateTime.Now,
                    IsActive = true,
                    Role = UserRole.Admin
                };

                context.Users.Add(admin);
                context.SaveChanges();

                Console.WriteLine("Database initialized successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error initializing database: {ex.Message}");
                // Consider logging the error or showing a more user-friendly message
            }
        }

    }
}
