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
        [FromForm] int? duration)
    {
        Console.WriteLine($"[API] Metadata received: Title={title}");

        var mp3 = new Mp3File
        {
            Title = title,       // Requis
            Artist = artist,     // Sera stocké NULL en BD si absent
            Album = album,       // Sera stocké NULL en BD si absent
            Genre = genre,       // Sera stocké NULL en BD si absent
            
            // Pour les types numériques en BD, l'entier doit accepter le NULL dans le modèle Mp3File.
            Year = year ?? 0,          // Si tu veux stocker 0 ou une valeur par défaut
            Duration = duration ?? 0,  // Si tu veux stocker 0 ou une valeur par défaut
            
            FilePath = $"temp_path_{Guid.NewGuid()}.mp3",
            CreatedAt = DateTime.UtcNow
        };

        _db.Mp3Files.Add(mp3);
        await _db.SaveChangesAsync(); 

        return Ok(new
        {
            success = true,
            id = mp3.Id,
            title = mp3.Title,
            artist = mp3.Artist,
            album = mp3.Album,
            genre = mp3.Genre,
            year = mp3.Year,
            duration = mp3.Duration
        });
    }
}