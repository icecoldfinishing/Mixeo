namespace SoundFlow.Api.Models;

public class Mp3UploadDto
{
    public IFormFile File { get; set; } = null!;
    public string? Title { get; set; }
    public string? Artist { get; set; }
    public string? Album { get; set; }
    public string? Genre { get; set; }
    public int? Year { get; set; }
    public int? Duration { get; set; }
}