namespace Mixeo.Api.Models;

public class PlaylistCriteriaDto
{
    public string Name { get; set; } = "Nouvelle Playlist";
    public int TotalDuration { get; set; } // En secondes
    public List<string> Genres { get; set; } = new();
    public List<string> Languages { get; set; } = new();
    public List<string> Artists { get; set; } = new();
    public List<string> Albums { get; set; } = new();
    public List<string> ExcludeArtists { get; set; } = new();
    public List<string> ExcludeGenres { get; set; } = new();
    public List<string> ExcludeAlbums { get; set; } = new();
}

public class SavePlaylistDto
{
    public string Name { get; set; } = null!;
    public List<int> Mp3Ids { get; set; } = new();
    public int? UserId { get; set; }
    public PlaylistCriteriaDto? Criteria { get; set; }
}