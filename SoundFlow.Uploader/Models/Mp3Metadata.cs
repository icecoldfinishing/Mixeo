namespace SoundFlow.Uploader.Models;

public class Mp3Metadata
{
    public string Title { get; set; } = "";
    public string Artist { get; set; } = "";
    public string Album { get; set; } = "";
    public string Genre { get; set; } = "";
    public int Year { get; set; }
    public int Duration { get; set; }

    public string Path { get; set; } = "";
}