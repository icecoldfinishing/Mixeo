using Microsoft.AspNetCore.Mvc;
using SoundFlow.Api.Data;
using SoundFlow.Api.Models;

namespace SoundFlow.Api.Controllers;

[ApiController]
[Route("api/mp3")]
public class Mp3Controller : ControllerBase
{
    private readonly AppDbContext _db;

    public Mp3Controller(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(
    [FromForm] string? title,
    [FromForm] string? artist,
    [FromForm] string? album,
    [FromForm] string? genre,
    [FromForm] int? year,
    [FromForm] int? duration,
    [FromForm] IFormFile file)
    {
        Console.WriteLine($"[API] Received: {title}");

        string filePath = "";

        if (file != null && file.Length > 0)
        {
            var folder = Path.Combine("Uploads", "mp3");
            Directory.CreateDirectory(folder);

            filePath = Path.Combine(folder, file.FileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);
        }

        var mp3 = new Mp3File
        {
            Title = title,
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
}