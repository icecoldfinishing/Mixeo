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
        [FromForm] string title,
        [FromForm] string? artist,
        [FromForm] string? album,
        [FromForm] string? genre,
        [FromForm] int? year,
        [FromForm] int? duration)
    {
        Console.WriteLine($"[API] Metadata received: Title={title}, Year={year}, Duration={duration}");

        var mp3 = new Mp3File
        {
            Title = title,
            Artist = artist,
            Album = album,
            Genre = genre,
            // Si l'entier reçu est nul, on applique une valeur par défaut pour éviter de faire planter la BD
            Year = year ?? 2026, 
            Duration = duration ?? 0,
            FilePath = $"temp_path_{Guid.NewGuid()}.mp3",
            CreatedAt = DateTime.UtcNow
        };

        _db.Mp3Files.Add(mp3);
        await _db.SaveChangesAsync(); 

        return Ok(new
        {
            success = true,
            title = mp3.Title,
            year = mp3.Year,
            duration = mp3.Duration
        });
    }
}