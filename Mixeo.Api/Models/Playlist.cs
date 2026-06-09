using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mixeo.Api.Models;

[Table("playlists")]
public class Playlist
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = null!;

    [Column("total_duration")]
    public int TotalDuration { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<PlaylistTrack> Tracks { get; set; } = new();
    public PlaylistRule? Rule { get; set; }
}