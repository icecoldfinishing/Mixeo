using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mixeo.Api.Data;
using Mixeo.Api.Models;

namespace Mixeo.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var exists = await _db.Users.AnyAsync(u => u.Username.ToLower() == dto.Username.ToLower());
        if (exists)
        {
            return BadRequest(new { message = "Username already taken." });
        }

        // Simple representation hash (for learning/project environment so no extra packages are strictly needed)
        var passwordHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(dto.Password));

        var user = new User
        {
            Username = dto.Username,
            PasswordHash = passwordHash
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new { id = user.Id, username = user.Username });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var passwordHash = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(dto.Password));
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == dto.Username && u.PasswordHash == passwordHash);

        if (user == null)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        return Ok(new { id = user.Id, username = user.Username });
    }

    [HttpGet("verify/{id}")]
    public async Task<IActionResult> Verify(int id)
    {
        var exists = await _db.Users.AnyAsync(u => u.Id == id);
        if (!exists)
        {
            return NotFound(new { message = "User not found." });
        }
        return Ok(new { valid = true });
    }
}

public class AuthDto
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
}
