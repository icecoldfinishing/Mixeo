using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mixeo.Api.Models;

[Table("mp3_files")]
public class Mp3File
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("title")]
    public string? Title { get; set; }

    [Column("artist")]
    public string? Artist { get; set; }

    [Column("album")]
    public string? Album { get; set; }

    [Column("genre")]
    public string? Genre { get; set; }

    [Column("language")]
    public string? Language { get; set; }

    [Column("year")]
    public int? Year { get; set; }

    [Column("duration")]
    public int? Duration { get; set; }

    [Column("file_path")]
    public string? FilePath { get; set; }

    [Column("lyrics")]
    public string? Lyrics { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}