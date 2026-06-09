using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

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

    [Column("user_id")]
    public int? UserId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public User? User { get; set; }

    public List<PlaylistTrack> Tracks { get; set; } = new();
    public PlaylistRule? Rule { get; set; }
}