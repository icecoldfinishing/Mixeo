using System.IO.Compression;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SoundFlow.Api.Data;
using SoundFlow.Api.Models;

namespace SoundFlow.Api.Controllers;

[ApiController]
[Route("api/playlists")]
public class PlaylistController : ControllerBase
{
    private readonly AppDbContext _db;

    public PlaylistController(AppDbContext db)
    {
        _db = db;
    }

    // 1. GÉNÉRATION TEMPORAIRE (Pour le client Web React avant sauvegarde)
    [HttpPost("generate")]
    public async Task<IActionResult> GeneratePlaylist([FromBody] PlaylistCriteriaDto criteria)
    {
        var query = _db.Mp3Files.AsQueryable();

        // Application des filtres d'inclusion
        if (!string.IsNullOrEmpty(criteria.Genre))
            query = query.Where(m => m.Genre != null && m.Genre.ToLower().Contains(criteria.Genre.ToLower()));

        if (!string.IsNullOrEmpty(criteria.Artist))
            query = query.Where(m => m.Artist != null && m.Artist.ToLower().Contains(criteria.Artist.ToLower()));

        // Application des filtres d'exclusion
        if (!string.IsNullOrEmpty(criteria.ExcludeGenre))
            query = query.Where(m => m.Genre == null || !m.Genre.ToLower().Contains(criteria.ExcludeGenre.ToLower()));

        if (!string.IsNullOrEmpty(criteria.ExcludeArtist))
            query = query.Where(m => m.Artist == null || !m.Artist.ToLower().Contains(criteria.ExcludeArtist.ToLower()));

        var availableTracks = await query.ToListAsync();

        // Algorithme de sélection par rapport à la durée totale demandée
        var selectedTracks = new List<Mp3File>();
        int currentDuration = 0;

        // On mélange aléatoirement les pistes disponibles
        var rng = new Random();
        availableTracks = availableTracks.OrderBy(_ => rng.Next()).ToList();

        foreach (var track in availableTracks)
        {
            int trackDuration = track.Duration ?? 0;
            if (currentDuration + trackDuration <= criteria.TotalDuration)
            {
                selectedTracks.Add(track);
                currentDuration += trackDuration;
            }
            else if (selectedTracks.Count == 0) 
            {
                // Permet d'ajouter au moins une musique si elle dépasse d'un coup
                selectedTracks.Add(track);
                break;
            }
        }

        return Ok(new { tracks = selectedTracks, totalDuration = currentDuration });
    }

    // 2. SAUVEGARDE DE LA PLAYLIST APPRÉCIÉE ET MODIFIÉE
    [HttpPost("save")]
    public async Task<IActionResult> SavePlaylist([FromBody] SavePlaylistDto dto)
    {
        if (dto.Mp3Ids == null || dto.Mp3Ids.Count == 0)
            return BadRequest("Cannot save an empty playlist.");

        var tracks = await _db.Mp3Files.Where(m => dto.Mp3Ids.Contains(m.Id)).ToListAsync();
        int totalDuration = tracks.Sum(t => t.Duration ?? 0);

        var playlist = new Playlist
        {
            Name = dto.Name,
            TotalDuration = totalDuration,
            CreatedAt = DateTime.UtcNow
        };

        _db.Playlists.Add(playlist);
        await _db.SaveChangesAsync();

        // Ajout des liaisons de tracks
        foreach (var trackId in dto.Mp3Ids)
        {
            _db.PlaylistTracks.Add(new PlaylistTrack { PlaylistId = playlist.Id, Mp3Id = trackId });
        }

        // Optionnel : Sauvegarde des critères appliqués
        if (dto.Criteria != null)
        {
            _db.PlaylistRules.Add(new PlaylistRule
            {
                PlaylistId = playlist.Id,
                MaxDuration = dto.Criteria.TotalDuration,
                Genre = dto.Criteria.Genre,
                Artist = dto.Criteria.Artist,
                ExcludeArtist = dto.Criteria.ExcludeArtist,
                ExcludeGenre = dto.Criteria.ExcludeGenre
            });
        }

        await _db.SaveChangesAsync();
        return Ok(playlist);
    }

    // 3. GET ALL PLAYLISTS
    [HttpGet]
    public async Task<IActionResult> GetPlaylists()
    {
        return Ok(await _db.Playlists.Include(p => p.Tracks).ThenInclude(t => t.Mp3File).ToListAsync());
    }

    // 4. ÉCOUTER / STREAMER UN MP3 DE LA PLAYLIST
    [HttpGet("stream/{mp3Id}")]
    public async Task<IActionResult> StreamMp3(int mp3Id)
    {
        var mp3 = await _db.Mp3Files.FindAsync(mp3Id);
        if (mp3 == null || string.IsNullOrEmpty(mp3.FilePath) || !System.IO.File.Exists(mp3.FilePath))
            return NotFound("Audio file not found.");

        var memory = new MemoryStream();
        using (var stream = new FileStream(mp3.FilePath, FileMode.Open))
        {
            await stream.CopyToAsync(memory);
        }
        memory.Position = 0;

        return File(memory, "audio/mpeg", Path.GetFileName(mp3.FilePath), enableRangeProcessing: true);
    }

    // 5. TÉLÉCHARGER LA PLAYLIST AU FORMAT ZIP
    [HttpGet("{id}/download-zip")]
    public async Task<IActionResult> DownloadPlaylistZip(int id)
    {
        var playlist = await _db.Playlists
            .Include(p => p.Tracks)
            .ThenInclude(t => t.Mp3File)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (playlist == null) return NotFound("Playlist not found");

        var zipPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}_playlist.zip");

        using (var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create))
        {
            foreach (var track in playlist.Tracks)
            {
                var file = track.Mp3File;
                if (file != null && !string.IsNullOrEmpty(file.FilePath) && System.IO.File.Exists(file.FilePath))
                {
                    // Évite les collisions de nom de fichier dans l'archive ZIP
                    string entryName = $"{file.Artist} - {file.Title}{Path.GetExtension(file.FilePath)}";
                    archive.CreateEntryFromFile(file.FilePath, entryName);
                }
            }
        }

        var bytes = await System.IO.File.ReadAllBytesAsync(zipPath);
        System.IO.File.Delete(zipPath); // Nettoyage du fichier temporaire

        return File(bytes, "application/zip", $"{playlist.Name}.zip");
    }
}