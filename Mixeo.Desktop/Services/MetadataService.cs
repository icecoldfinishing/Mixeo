using TagLib;
using Mixeo.Desktop.Models;

namespace Mixeo.Desktop.Services;

public class MetadataService
{
    public Mp3Metadata Extract(
        string filePath
    )
    {
        var mp3 =
            File.Create(filePath);

        return new Mp3Metadata
        {
            Path=filePath,

            Title=
                mp3.Tag.Title ?? "",

            Album=
                mp3.Tag.Album ?? "",

            Genre=
                mp3.Tag.FirstGenre ?? "",

            Artist=
                mp3.Tag.FirstPerformer ?? "",

            Duration=
                (int)
                mp3.Properties
                    .Duration
                    .TotalSeconds,

            Year=
                (int)
                mp3.Tag.Year
        };
    }
}