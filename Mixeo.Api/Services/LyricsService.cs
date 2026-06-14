using System.Diagnostics;
using Mixeo.Api.Data;
using Mixeo.Api.Models;

namespace Mixeo.Api.Services;

public class LyricsService
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public LyricsService(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    public async Task<string?> GetOrDownloadLyricsAsync(Mp3File mp3)
    {
        // 1. Check if already downloaded
        if (!string.IsNullOrEmpty(mp3.Lyrics))
        {
            return mp3.Lyrics;
        }

        // 2. Prepare Python script call
        var songQuery = $"{mp3.Title} {mp3.Artist}".Trim();
        if (string.IsNullOrEmpty(songQuery))
        {
            return null;
        }

        var pythonScriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "Mixeo.Lyric", "main.py");
        if (!File.Exists(pythonScriptPath))
        {
            // fallback for runtime
            pythonScriptPath = Path.Combine(_env.ContentRootPath, "..", "Mixeo.Lyric", "main.py");
        }

        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"\"{pythonScriptPath}\" \"{songQuery}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = Path.Combine(_env.ContentRootPath, "..", "Mixeo.Lyric")
            };

            using var process = Process.Start(startInfo);
            if (process == null) return null;

            string output = await process.StandardOutput.ReadToEndAsync();
            await process.WaitForExitAsync();

            output = output.Trim();

            // Si le script python a bien retourné quelque chose (pas une erreur sur stderr uniquement)
            if (!string.IsNullOrEmpty(output))
            {
                mp3.Lyrics = output;
                _db.Mp3Files.Update(mp3);
                await _db.SaveChangesAsync();

                return output;
            }

            return null;
        }
        catch
        {
            return null;
        }
    }
}
