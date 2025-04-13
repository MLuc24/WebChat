using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using WeChat.Data;
using WeChat.Models;
using WeChat.ViewModels;

namespace WeChat.Controllers;

[Authorize]
public class DocumentController : Controller
{
    private readonly WebChatContext _context;

    public DocumentController(WebChatContext context)
    {
        _context = context;
    }

    // GET: /Document
    public IActionResult Index()
    {
        return View();
    }

    // GET: /Document/GetDocuments
    [HttpGet]
    public async Task<IActionResult> GetDocuments()
    {
        try
        {
            var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
            var documents = await _context.Documents
                .Include(d => d.UploadedByNavigation)
                .Where(d => d.IsPublic || d.UploadedBy == userId)
                .OrderByDescending(d => d.UploadDate)
                .Select(d => new DocumentViewModel
                {
                    DocumentId = d.DocumentId,
                    Title = d.Title,
                    Description = d.Description,
                    Category = d.Category,
                    UploadedBy = d.UploadedByNavigation.Username,
                    UploadDate = d.UploadDate,
                    IsPublic = d.IsPublic
                })
                .ToListAsync();

            return Ok(documents);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Error retrieving documents: {ex.Message}" });
        }
    }

    // POST: /Document/Create
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([FromBody] CreateDocumentViewModel model)
    {
        try
        {
            if (ModelState.IsValid)
            {
                var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
                var document = new Document
                {
                    Title = model.Title,
                    Description = model.Description,
                    Category = model.Category,
                    IsPublic = model.IsPublic,
                    UploadedBy = userId,
                    UploadDate = DateTime.Now
                };

                _context.Add(document);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Document created successfully",
                    documentId = document.DocumentId
                });
            }

            return BadRequest(new
            {
                success = false,
                message = "Invalid document data",
                errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error creating document: {ex.Message}" });
        }
    }

    // PUT: /Document/Edit/5
    [HttpPut]
    [ValidateAntiForgeryToken]
    [Route("Document/Edit/{id}")]
    public async Task<IActionResult> Edit(int id, [FromBody] CreateDocumentViewModel model)
    {
        try
        {
            var existingDocument = await _context.Documents.FindAsync(id);
            if (existingDocument == null)
            {
                return NotFound(new { success = false, message = "Document not found" });
            }

            var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
            if (existingDocument.UploadedBy != userId && !User.IsInRole("Admin"))
            {
                return Forbid();
            }

            if (ModelState.IsValid)
            {
                existingDocument.Title = model.Title;
                existingDocument.Description = model.Description;
                existingDocument.Category = model.Category;
                existingDocument.IsPublic = model.IsPublic;

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "Document updated successfully" });
            }

            return BadRequest(new
            {
                success = false,
                message = "Invalid document data",
                errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
            });
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!DocumentExists(id))
            {
                return NotFound(new { success = false, message = "Document not found" });
            }
            throw;
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error updating document: {ex.Message}" });
        }
    }

    // DELETE: /Document/Delete/5
    [HttpDelete]
    [ValidateAntiForgeryToken]
    [Route("Document/Delete/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var document = await _context.Documents.FindAsync(id);
            if (document == null)
            {
                return NotFound(new { success = false, message = "Document not found" });
            }

            var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
            if (document.UploadedBy != userId && !User.IsInRole("Admin"))
            {
                return Forbid();
            }

            _context.Documents.Remove(document);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Document deleted successfully" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error deleting document: {ex.Message}" });
        }
    }

    // GET: /Document/Details/5
    [HttpGet]
    [Route("Document/Details/{id}")]
    public async Task<IActionResult> Details(int id)
    {
        try
        {
            var userId = int.Parse(User.FindFirst("UserId")?.Value ?? "0");
            var document = await _context.Documents
                .Include(d => d.UploadedByNavigation)
                .Where(d => d.DocumentId == id && (d.IsPublic || d.UploadedBy == userId))
                .Select(d => new DocumentViewModel
                {
                    DocumentId = d.DocumentId,
                    Title = d.Title,
                    Description = d.Description,
                    Category = d.Category,
                    UploadedBy = d.UploadedByNavigation.Username,
                    UploadDate = d.UploadDate,
                    IsPublic = d.IsPublic
                })
                .FirstOrDefaultAsync();

            if (document == null)
            {
                return NotFound(new { success = false, message = "Document not found" });
            }

            return Ok(document);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = $"Error retrieving document: {ex.Message}" });
        }
    }

    private bool DocumentExists(int id)
    {
        return _context.Documents.Any(e => e.DocumentId == id);
    }
}
