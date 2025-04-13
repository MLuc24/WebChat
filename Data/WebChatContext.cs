using Microsoft.EntityFrameworkCore;
using System;
using WeChat.Models;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Query;

namespace WeChat.Data
{
    public class WebChatContext : DbContext
    {
        public WebChatContext(DbContextOptions<WebChatContext> options) : base(options)
        {
        }

        // User management
        public DbSet<User> Users { get; set; }

        // Messaging system
        public DbSet<Message> Messages { get; set; }
        public DbSet<Attachment> Attachments { get; set; }
        public DbSet<Conversation> Conversations { get; set; }

        // Document management
        public DbSet<Document> Documents { get; set; }

        // Event management
        public DbSet<Event> Events { get; set; }

        // Subscription system
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<Friend> Friends { get; set; }


        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Set the default query splitting behavior to SplitQuery
            if (!optionsBuilder.IsConfigured)
            {
                optionsBuilder.UseSqlServer("YourConnectionStringHere",
                    sqlServerOptions => sqlServerOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
            }
            else
            {
                // Apply splitting behavior to the existing configuration
                optionsBuilder.ConfigureWarnings(warnings =>
                    warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.MultipleCollectionIncludeWarning));
            }

            base.OnConfiguring(optionsBuilder);
        }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Password).IsRequired();
                entity.Property(e => e.FullName).HasMaxLength(100);
                entity.Property(e => e.ProfilePicture).HasMaxLength(255);
                entity.Property(e => e.Department).HasMaxLength(100);
                entity.Property(e => e.JobTitle).HasMaxLength(100);

                // Create unique indexes
                entity.HasIndex(e => e.Username).IsUnique();
                entity.HasIndex(e => e.Email).IsUnique();
            });

            // Configure Message entity
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasKey(e => e.Id);

                // Configure relationships
                entity.HasOne(m => m.Sender)
                    .WithMany()
                    .HasForeignKey(m => m.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(m => m.Receiver)
                    .WithMany()
                    .HasForeignKey(m => m.ReceiverId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Create indexes for better performance
                entity.HasIndex(e => e.SenderId);
                entity.HasIndex(e => e.ReceiverId);
                entity.HasIndex(e => e.SentAt);
            });

            // Configure Attachment entity
            modelBuilder.Entity<Attachment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.FilePath).IsRequired().HasMaxLength(500);
                entity.Property(e => e.FileType).IsRequired().HasMaxLength(100);

                // Configure relationship
                entity.HasOne(a => a.Message)
                    .WithMany(m => m.Attachments)
                    .HasForeignKey(a => a.MessageId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Conversation entity
            modelBuilder.Entity<Conversation>(entity =>
            {
                entity.HasKey(e => e.Id);

                // Configure relationships
                entity.HasOne(c => c.User1)
                    .WithMany()
                    .HasForeignKey(c => c.User1Id)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(c => c.User2)
                    .WithMany()
                    .HasForeignKey(c => c.User2Id)
                    .OnDelete(DeleteBehavior.Restrict);

                // Create unique constraint to ensure conversation uniqueness
                entity.HasIndex(c => new { c.User1Id, c.User2Id }).IsUnique();

                // Create index for better performance
                entity.HasIndex(e => e.LastActivity);
            });

            // Configure Document entity - UPDATED
            modelBuilder.Entity<Document>(entity =>
            {
                entity.HasKey(e => e.DocumentId);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
                entity.Property(e => e.UploadDate).HasDefaultValueSql("GETDATE()");
                entity.Property(e => e.IsPublic).HasDefaultValue(true);

                // Configure relationship
                entity.HasOne(d => d.UploadedByNavigation)
                    .WithMany(u => u.Documents)
                    .HasForeignKey(d => d.UploadedBy)
                    .OnDelete(DeleteBehavior.Restrict);

                // Add indexes for better performance
                entity.HasIndex(e => e.UploadedBy);
                entity.HasIndex(e => e.Category);
            });

            // Configure Event entity
            modelBuilder.Entity<Event>(entity =>
            {
                entity.HasKey(e => e.EventId);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Location).HasMaxLength(255);

                // Configure relationship
                entity.HasOne(e => e.CreatedByNavigation)
                    .WithMany(u => u.Events)
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure Subscription entity
            modelBuilder.Entity<Subscription>(entity =>
            {
                entity.HasKey(e => e.SubscriptionId);
                entity.Property(e => e.PlanName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.PaymentStatus).HasMaxLength(50);

                // Fix the decimal precision warning by specifying the precision and scale for the Price property
                entity.Property(e => e.Price)
                    .HasPrecision(10, 2); // 10 digits total, 2 decimal places (can store up to 99,999,999.99)

                // Map CreatedAt property to CreatedDate column in database
                entity.Property(e => e.CreatedAt)
                    .IsRequired()
                    .HasColumnName("CreatedDate")
                    .HasDefaultValueSql("GETDATE()"); // Default value for new rows

                // Configure relationship
                entity.HasOne(s => s.User)
                    .WithMany(u => u.Subscriptions)
                    .HasForeignKey(s => s.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure Friend entity
            modelBuilder.Entity<Friend>(entity =>
            {
                entity.HasOne(f => f.Requester)
                    .WithMany(u => u.SentFriendRequests)
                    .HasForeignKey(f => f.RequesterId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(f => f.Recipient)
                    .WithMany(u => u.ReceivedFriendRequests)
                    .HasForeignKey(f => f.RecipientId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
