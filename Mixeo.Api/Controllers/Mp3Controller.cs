using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mixeo.Api.Data;
using Mixeo.Api.Models;

namespace Mixeo.Api.Controllers;

[ApiController]
[Route("api/mp3")]
public class Mp3Controller : ControllerBase
{
    private readonly AppDbContext _db;

    public Mp3Controller(AppDbContext db)
    {
        _db = db;
    }

    // 1. UPLOAD (Celui que nous avons validé ensemble)
    [HttpPost("upload")]
    public async Task<IActionResult> Upload(
        [FromForm] string? title,
        [FromForm] string? artist,
        [FromForm] string? album,
        [FromForm] string? genre,
        [FromForm] int? year,
        [FromForm] int? duration,
        [FromForm] IFormFile? file)
    {
        string? filePath = null;

        if (file != null && file.Length > 0)
        {
            var folder = Path.Combine("Uploads", "mp3");
            Directory.CreateDirectory(folder);

            filePath = Path.Combine(folder, $"{Guid.NewGuid()}_{file.FileName}");

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);
        }

        var mp3 = new Mp3File
        {
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file?.FileName) ?? "Unknown" : title,
            Artist = artist,
            Album = album,
            Genre = genre,
            Year = year ?? 0,
            Duration = duration ?? 0,
            FilePath = filePath,
            CreatedAt = DateTime.UtcNow
        };

        _db.Mp3Files.Add(mp3);
        await _db.SaveChangesAsync();

        return Ok(mp3);
    }

    // 2. GET ALL
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _db.Mp3Files.OrderByDescending(m => m.CreatedAt).ToListAsync());
    }

    // 3. GET BY ID
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var mp3 = await _db.Mp3Files.FindAsync(id);
        return mp3 == null ? NotFound() : Ok(mp3);
    }

    // 4. UPDATE (CRUD Web)
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Mp3File updatedMp3)
    {
        var mp3 = await _db.Mp3Files.FindAsync(id);
        if (mp3 == null) return NotFound();

        mp3.Title = updatedMp3.Title;
        mp3.Artist = updatedMp3.Artist;
        mp3.Album = updatedMp3.Album;
        mp3.Genre = updatedMp3.Genre;
        mp3.Year = updatedMp3.Year;
        mp3.Duration = updatedMp3.Duration;

        await _db.SaveChangesAsync();
        return Ok(mp3);
    }

    // 5. DELETE (CRUD Web + Supprime le fichier physique)
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var mp3 = await _db.Mp3Files.FindAsync(id);
        if (mp3 == null) return NotFound();

        if (!string.IsNullOrEmpty(mp3.FilePath) && System.IO.File.Exists(mp3.FilePath))
        {
            System.IO.File.Delete(mp3.FilePath);
        }

        _db.Mp3Files.Remove(mp3);
        await _db.SaveChangesAsync();
        return Ok(new { message = "File deleted successfully" });
    }
}