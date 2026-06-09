using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Mixeo.Api.Models;

[Table("playlist_rules")]
public class PlaylistRule
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("playlist_id")]
    public int PlaylistId { get; set; }

    [Column("max_duration")]
    public int? MaxDuration { get; set; }

    [Column("genre")]
    public string? Genre { get; set; }

    [Column("artist")]
    public string? Artist { get; set; }

    [Column("language")]
    public string? Language { get; set; }

    [Column("exclude_artist")]
    public string? ExcludeArtist { get; set; }

    [Column("exclude_genre")]
    public string? ExcludeGenre { get; set; }

    [JsonIgnore]
    public Playlist? Playlist { get; set; }
}