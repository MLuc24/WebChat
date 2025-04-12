// Controllers/EventController.cs
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
    [Authorize]
    public class EventController : Controller
    {
        private readonly WebChatContext _context;

        public EventController(WebChatContext context)
        {
            _context = context;
        }

        // GET: Event
        public IActionResult Index()
        {
            return View();
        }

        #region API Endpoints for AJAX

        // GET: Event/GetEvents - Retrieves all events for the calendar
        [HttpGet]
        public async Task<IActionResult> GetEvents()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            var userId = int.Parse(userIdClaim.Value);

            var events = await _context.Events
                .Where(e => e.CreatedBy == userId)
                .Select(e => new
                {
                    id = e.EventId,
                    title = e.Title,
                    description = e.Description,
                    start = e.StartTime,
                    end = e.EndTime,
                    location = e.Location,
                    allDay = e.IsAllDay ?? false
                })
                .ToListAsync();

            return Json(events);
        }

        // GET: Event/GetEventById/5 - Gets a single event by ID
        [HttpGet]
        public async Task<IActionResult> GetEventById(int id)
        {
            var @event = await _context.Events.FindAsync(id);
            if (@event == null)
            {
                return NotFound();
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            // Check if the current user is the creator
            if (@event.CreatedBy != int.Parse(userIdClaim.Value))
            {
                return Forbid();
            }

            // Fix for CS8601 warnings in Edit methods
            var eventViewModel = new EventViewModel
            {
                EventId = @event.EventId,
                Title = @event.Title,
                Description = @event.Description ?? "",
                StartTime = @event.StartTime,
                EndTime = @event.EndTime,
                Location = @event.Location ?? "",
                IsAllDay = @event.IsAllDay ?? false
            };

            return Json(eventViewModel);
        }

        // GET: Event/GetUpcomingEvents - Gets upcoming events for the home page dashboard
        [HttpGet]
        public async Task<IActionResult> GetUpcomingEvents()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return StatusCode(401, new { success = false, message = "User is not authorized" });
            }

            var userId = int.Parse(userIdClaim.Value);

            // Get current date without time component
            var today = DateTime.Today;

            // Get events that start today or in the future, order by start time
            var events = await _context.Events
                .Where(e => e.CreatedBy == userId && e.StartTime.Date >= today)
                .OrderBy(e => e.StartTime)
                .Select(e => new
                {
                    id = e.EventId,
                    title = e.Title,
                    description = e.Description,
                    start = e.StartTime,
                    end = e.EndTime,
                    location = e.Location,
                    allDay = e.IsAllDay ?? false
                })
                .Take(5) // Limit to 5 upcoming events
                .ToListAsync();

            return Json(events);
        }


        // POST: Event/CreateEvent - Creates a new event via AJAX
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateEvent([FromBody] EventViewModel eventViewModel)
        {
            // Fix for CS8602 warning at line 197 in UpdateEvent method
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid form data",
                    errors = ModelState.ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value?.Errors?.Select(e => e.ErrorMessage).ToArray() ?? Array.Empty<string>()
                    )
                });
            }

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                {
                    return Unauthorized(new { success = false, message = "User is not authorized" });
                }

                var @event = new Event
                {
                    Title = eventViewModel.Title,
                    Description = eventViewModel.Description,
                    StartTime = eventViewModel.StartTime,
                    EndTime = eventViewModel.EndTime,
                    Location = eventViewModel.Location,
                    IsAllDay = eventViewModel.IsAllDay,
                    CreatedBy = int.Parse(userIdClaim.Value),
                    CreatedDate = DateTime.Now
                };

                _context.Add(@event);
                await _context.SaveChangesAsync();

                return Json(new { success = true, eventId = @event.EventId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while creating the event", error = ex.Message });
            }
        }

        // PUT: Event/UpdateEvent - Updates an existing event via AJAX
        [HttpPut]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateEvent([FromBody] EventViewModel eventViewModel)
        {
            // Fix for CS8602 warning at line 148 in CreateEvent method
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid form data",
                    errors = ModelState.ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value?.Errors?.Select(e => e.ErrorMessage).ToArray() ?? Array.Empty<string>()
                    )
                });
            }

            try
            {
                var @event = await _context.Events.FindAsync(eventViewModel.EventId);
                if (@event == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                {
                    return Unauthorized(new { success = false, message = "User is not authorized" });
                }

                // Only the creator can edit the event
                if (@event.CreatedBy != int.Parse(userIdClaim.Value))
                {
                    return Forbid();
                }

                @event.Title = eventViewModel.Title;
                @event.Description = eventViewModel.Description;
                @event.StartTime = eventViewModel.StartTime;
                @event.EndTime = eventViewModel.EndTime;
                @event.Location = eventViewModel.Location;
                @event.IsAllDay = eventViewModel.IsAllDay;

                _context.Update(@event);
                await _context.SaveChangesAsync();

                return Json(new { success = true });
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EventExists(eventViewModel.EventId))
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }
                else
                {
                    return StatusCode(500, new { success = false, message = "A concurrency issue occurred while updating the event" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while updating the event", error = ex.Message });
            }
        }

        // DELETE: Event/DeleteEvent/5 - Deletes an event via AJAX
        [HttpDelete]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            try
            {
                var @event = await _context.Events.FindAsync(id);
                if (@event == null)
                {
                    return NotFound(new { success = false, message = "Event not found" });
                }

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                {
                    return Unauthorized(new { success = false, message = "User is not authorized" });
                }

                // Only the creator can delete the event
                if (@event.CreatedBy != int.Parse(userIdClaim.Value))
                {
                    return Forbid();
                }

                _context.Events.Remove(@event);
                await _context.SaveChangesAsync();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred while deleting the event", error = ex.Message });
            }
        }


        #endregion

        #region Traditional (non-AJAX) Actions

        // GET: Event/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var @event = await _context.Events
                .Include(e => e.CreatedByNavigation)
                .FirstOrDefaultAsync(m => m.EventId == id);

            if (@event == null)
            {
                return NotFound();
            }

            return View(@event);
        }

        // GET: Event/Create
        public IActionResult Create()
        {
            return View();
        }

        // POST: Event/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(EventViewModel eventViewModel)
        {
            if (ModelState.IsValid)
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null)
                {
                    return Unauthorized();
                }

                var @event = new Event
                {
                    Title = eventViewModel.Title,
                    Description = eventViewModel.Description,
                    StartTime = eventViewModel.StartTime,
                    EndTime = eventViewModel.EndTime,
                    Location = eventViewModel.Location,
                    IsAllDay = eventViewModel.IsAllDay,
                    CreatedBy = int.Parse(userIdClaim.Value),
                    CreatedDate = DateTime.Now
                };

                _context.Add(@event);
                await _context.SaveChangesAsync();
                return RedirectToAction(nameof(Index));
            }
            return View(eventViewModel);
        }

        // GET: Event/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var @event = await _context.Events.FindAsync(id);
            if (@event == null)
            {
                return NotFound();
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            // Only the creator can edit the event
            if (@event.CreatedBy != int.Parse(userIdClaim.Value))
            {
                return Forbid();
            }

            // Fix for CS8601 warnings in Edit methods
            var eventViewModel = new EventViewModel
            {
                EventId = @event.EventId,
                Title = @event.Title,
                Description = @event.Description ?? "",
                StartTime = @event.StartTime,
                EndTime = @event.EndTime,
                Location = @event.Location ?? "",
                IsAllDay = @event.IsAllDay ?? false
            };

            return View(eventViewModel);
        }

        // POST: Event/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, EventViewModel eventViewModel)
        {
            if (id != eventViewModel.EventId)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    var @event = await _context.Events.FindAsync(id);
                    if (@event == null)
                    {
                        return NotFound();
                    }

                    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                    if (userIdClaim == null)
                    {
                        return Unauthorized();
                    }

                    // Only the creator can edit the event
                    if (@event.CreatedBy != int.Parse(userIdClaim.Value))
                    {
                        return Forbid();
                    }

                    @event.Title = eventViewModel.Title;
                    @event.Description = eventViewModel.Description;
                    @event.StartTime = eventViewModel.StartTime;
                    @event.EndTime = eventViewModel.EndTime;
                    @event.Location = eventViewModel.Location;
                    @event.IsAllDay = eventViewModel.IsAllDay;

                    _context.Update(@event);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!EventExists(eventViewModel.EventId))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                return RedirectToAction(nameof(Index));
            }
            return View(eventViewModel);
        }

        // GET: Event/Delete/5
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            var @event = await _context.Events
                .Include(e => e.CreatedByNavigation)
                .FirstOrDefaultAsync(m => m.EventId == id);

            if (@event == null)
            {
                return NotFound();
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            // Only the creator can delete the event
            if (@event.CreatedBy != int.Parse(userIdClaim.Value))
            {
                return Forbid();
            }

            return View(@event);
        }

        // POST: Event/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var @event = await _context.Events.FindAsync(id);
            if (@event == null)
            {
                return NotFound();
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            // Only the creator can delete the event
            if (@event.CreatedBy != int.Parse(userIdClaim.Value))
            {
                return Forbid();
            }

            _context.Events.Remove(@event);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        #endregion

        private bool EventExists(int id)
        {
            return _context.Events.Any(e => e.EventId == id);
        }
    }
}
