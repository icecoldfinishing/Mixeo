using System.IO.Compression;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mixeo.Api.Data;
using Mixeo.Api.Models;

namespace Mixeo.Api.Controllers;

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

        // 1. Genres autorisés (OR match between any of the criteria.Genres)
        if (criteria.Genres != null && criteria.Genres.Any())
        {
            var genresLower = criteria.Genres.Select(g => g.ToLower()).ToList();
            query = query.Where(m => m.Genre != null && genresLower.Any(g => m.Genre.ToLower().Contains(g)));
        }

        // 2. Langues autorisées (OR match)
        if (criteria.Languages != null && criteria.Languages.Any())
        {
            var langsLower = criteria.Languages.Select(l => l.ToLower()).ToList();
            query = query.Where(m => m.Language != null && langsLower.Any(l => m.Language.ToLower().Contains(l)));
        }

        // 3. Artistes autorisés (OR match)
        if (criteria.Artists != null && criteria.Artists.Any())
        {
            var artistsLower = criteria.Artists.Select(a => a.ToLower()).ToList();
            query = query.Where(m => m.Artist != null && artistsLower.Any(a => m.Artist.ToLower().Contains(a)));
        }

        // 4. Genres à exclure
        if (criteria.ExcludeGenres != null && criteria.ExcludeGenres.Any())
        {
            var exclGenresLower = criteria.ExcludeGenres.Select(g => g.ToLower()).ToList();
            query = query.Where(m => m.Genre == null || !exclGenresLower.Any(g => m.Genre.ToLower().Contains(g)));
        }

        // 5. Artistes à exclure
        if (criteria.ExcludeArtists != null && criteria.ExcludeArtists.Any())
        {
            var exclArtistsLower = criteria.ExcludeArtists.Select(a => a.ToLower()).ToList();
            query = query.Where(m => m.Artist == null || !exclArtistsLower.Any(a => m.Artist.ToLower().Contains(a)));
        }

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
                selectedTracks.Add(track);
                currentDuration += trackDuration;
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
            UserId = dto.UserId,
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
                Genre = string.Join(",", dto.Criteria.Genres ?? new List<string>()),
                Artist = string.Join(",", dto.Criteria.Artists ?? new List<string>()),
                Language = string.Join(",", dto.Criteria.Languages ?? new List<string>()),
                ExcludeArtist = string.Join(",", dto.Criteria.ExcludeArtists ?? new List<string>()),
                ExcludeGenre = string.Join(",", dto.Criteria.ExcludeGenres ?? new List<string>())
            });
        }

        await _db.SaveChangesAsync();

        var result = await _db.Playlists
            .Include(p => p.Tracks)
            .ThenInclude(t => t.Mp3File)
            .FirstOrDefaultAsync(p => p.Id == playlist.Id);

        return Ok(result);
    }

    // 3. GET PLAYLISTS BY USER ID
    [HttpGet]
    public async Task<IActionResult> GetPlaylists([FromQuery] int? userId)
    {
        var query = _db.Playlists.Include(p => p.Tracks).ThenInclude(t => t.Mp3File).AsQueryable();
        if (userId.HasValue)
        {
            query = query.Where(p => p.UserId == userId.Value);
        }
        return Ok(await query.ToListAsync());
    }

    // 3.5 DELETE PLAYLIST
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePlaylist(int id)
    {
        var playlist = await _db.Playlists.FindAsync(id);
        if (playlist == null) return NotFound();

        _db.Playlists.Remove(playlist);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // 3.6 PLAYLIST EDITS: ADD TRACK
    [HttpPost("{id}/add-track")]
    public async Task<IActionResult> AddTrack(int id, [FromBody] TrackActionDto dto)
    {
        var playlist = await _db.Playlists.Include(p => p.Tracks).FirstOrDefaultAsync(p => p.Id == id);
        if (playlist == null) return NotFound("Playlist not found");

        var track = await _db.Mp3Files.FindAsync(dto.TrackId);
        if (track == null) return NotFound("Track not found");

        // Add track
        _db.PlaylistTracks.Add(new PlaylistTrack { PlaylistId = id, Mp3Id = dto.TrackId });
        await _db.SaveChangesAsync();

        // Recalculate duration
        var allTracks = await _db.PlaylistTracks.Include(pt => pt.Mp3File).Where(pt => pt.PlaylistId == id).ToListAsync();
        playlist.TotalDuration = allTracks.Sum(t => t.Mp3File?.Duration ?? 0);
        await _db.SaveChangesAsync();

        return Ok(await _db.Playlists.Include(p => p.Tracks).ThenInclude(t => t.Mp3File).FirstOrDefaultAsync(p => p.Id == id));
    }

    // 3.7 PLAYLIST EDITS: REMOVE TRACK
    [HttpPost("{id}/remove-track")]
    public async Task<IActionResult> RemoveTrack(int id, [FromBody] TrackActionDto dto)
    {
        var playlist = await _db.Playlists.Include(p => p.Tracks).FirstOrDefaultAsync(p => p.Id == id);
        if (playlist == null) return NotFound("Playlist not found");

        var pt = await _db.PlaylistTracks.FirstOrDefaultAsync(x => x.PlaylistId == id && x.Mp3Id == dto.TrackId);
        if (pt != null)
        {
            _db.PlaylistTracks.Remove(pt);
            await _db.SaveChangesAsync();
        }

        // Recalculate duration
        var allTracks = await _db.PlaylistTracks.Include(pt => pt.Mp3File).Where(pt => pt.PlaylistId == id).ToListAsync();
        playlist.TotalDuration = allTracks.Sum(t => t.Mp3File?.Duration ?? 0);
        await _db.SaveChangesAsync();

        return Ok(await _db.Playlists.Include(p => p.Tracks).ThenInclude(t => t.Mp3File).FirstOrDefaultAsync(p => p.Id == id));
    }

    // 3.8 PLAYLIST EDITS: REPLACE TRACK
    [HttpPost("{id}/replace-track")]
    public async Task<IActionResult> ReplaceTrack(int id, [FromBody] ReplaceTrackDto dto)
    {
        var playlist = await _db.Playlists.Include(p => p.Tracks).FirstOrDefaultAsync(p => p.Id == id);
        if (playlist == null) return NotFound("Playlist not found");

        // Remove old
        var oldPt = await _db.PlaylistTracks.FirstOrDefaultAsync(x => x.PlaylistId == id && x.Mp3Id == dto.OldTrackId);
        if (oldPt != null)
        {
            _db.PlaylistTracks.Remove(oldPt);
        }

        // Add new
        _db.PlaylistTracks.Add(new PlaylistTrack { PlaylistId = id, Mp3Id = dto.NewTrackId });
        await _db.SaveChangesAsync();

        // Recalculate duration
        var allTracks = await _db.PlaylistTracks.Include(pt => pt.Mp3File).Where(pt => pt.PlaylistId == id).ToListAsync();
        playlist.TotalDuration = allTracks.Sum(t => t.Mp3File?.Duration ?? 0);
        await _db.SaveChangesAsync();

        return Ok(await _db.Playlists.Include(p => p.Tracks).ThenInclude(t => t.Mp3File).FirstOrDefaultAsync(p => p.Id == id));
    }

    // 4. ÉCOUTER / STREAMER UN MP3 DE LA PLAYLIST
    [HttpGet("stream/{mp3Id}")]
    public async Task<IActionResult> StreamMp3(int mp3Id)
    {
        var mp3 = await _db.Mp3Files.FindAsync(mp3Id);
        if (mp3 == null || string.IsNullOrEmpty(mp3.FilePath) || !System.IO.File.Exists(mp3.FilePath))
            return NotFound("Audio file not found.");

        var stream = new FileStream(mp3.FilePath, FileMode.Open, FileAccess.Read);
        return File(stream, "audio/mpeg", Path.GetFileName(mp3.FilePath), enableRangeProcessing: true);
    }

    [HttpGet("{id}/download-zip")]
    public async Task<IActionResult> DownloadPlaylistZip(int id)
    {
        var playlist = await _db.Playlists
            .Include(p => p.Tracks)
            .ThenInclude(t => t.Mp3File)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (playlist == null)
            return NotFound("Playlist not found");

        var memory = new MemoryStream();

        using (var archive =
            new ZipArchive(
                memory,
                ZipArchiveMode.Create,
                true
            ))
        {
            var metadata =
                new System.Text.StringBuilder();

            metadata.AppendLine($"Playlist Name: {playlist.Name}");
            metadata.AppendLine($"Total Duration: {playlist.TotalDuration}");
            metadata.AppendLine($"Created At: {playlist.CreatedAt}");
            metadata.AppendLine("--------------------------------");

            var usedNames =
                new HashSet<string>();

            int index = 1;

            foreach (var track in playlist.Tracks)
            {
                var file = track.Mp3File;

                if (file == null)
                    continue;

                metadata.AppendLine(
                    $"{index}. {file.Artist} - {file.Title}"
                );

                index++;

                if (
                    string.IsNullOrWhiteSpace(file.FilePath)
                    || !System.IO.File.Exists(file.FilePath)
                )
                    continue;

                string extension =
                    Path.GetExtension(
                        file.FilePath
                    );

                string entryName =
                    $"{file.Artist} - {file.Title}{extension}";

                int duplicate = 1;

                while (
                    usedNames.Contains(
                        entryName
                    )
                )
                {
                    entryName =
                        $"{file.Artist} - {file.Title} ({duplicate}){extension}";

                    duplicate++;
                }

                usedNames.Add(
                    entryName
                );

                var entry =
                    archive.CreateEntry(
                        entryName
                    );

                using var entryStream =
                    entry.Open();

                using var fileStream =
                    System.IO.File.OpenRead(
                        file.FilePath
                    );

                await fileStream.CopyToAsync(
                    entryStream
                );
            }

            var metaEntry =
                archive.CreateEntry(
                    "metadata.txt"
                );

            using (
                var writer =
                new StreamWriter(
                    metaEntry.Open()
                )
            )
            {
                await writer.WriteAsync(
                    metadata.ToString()
                );
            }
        }

        memory.Position = 0;

        return File(
            memory.ToArray(),
            "application/zip",
            $"{playlist.Name}.zip"
        );
    }
}

public class TrackActionDto
{
    public int TrackId { get; set; }
}

public class ReplaceTrackDto
{
    public int OldTrackId { get; set; }
    public int NewTrackId { get; set; }
}