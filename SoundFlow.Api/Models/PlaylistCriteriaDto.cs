namespace SoundFlow.Api.Models;

public class PlaylistCriteriaDto
{
    public string Name { get; set; } = "Nouvelle Playlist";
    public int TotalDuration { get; set; } // En secondes
    public string? Genre { get; set; }
    public string? Artist { get; set; }
    public string? ExcludeArtist { get; set; }
    public string? ExcludeGenre { get; set; }
}

public class SavePlaylistDto
{
    public string Name { get; set; } = null!;
    public List<int> Mp3Ids { get; set; } = new();
    public PlaylistCriteriaDto? Criteria { get; set; }
}