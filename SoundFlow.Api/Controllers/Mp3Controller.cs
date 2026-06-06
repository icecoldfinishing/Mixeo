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
    public async Task<IActionResult> Upload([FromForm] string title)
    {
        Console.WriteLine($"[API] Title received: {title}");

        var mp3 = new Mp3File
        {
            Title = title
        };

        _db.Mp3Files.Add(mp3);

        await _db.SaveChangesAsync(); 

        return Ok(new
        {
            success = true,
            title = title
        });
    }
}