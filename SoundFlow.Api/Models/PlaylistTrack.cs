using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SoundFlow.Api.Models;

[Table("playlist_tracks")]
public class PlaylistTrack
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("playlist_id")]
    public int PlaylistId { get; set; }

    [Column("mp3_id")]
    public int Mp3Id { get; set; }

    [JsonIgnore]
    public Playlist? Playlist { get; set; }
    
    public Mp3File? Mp3File { get; set; }
}