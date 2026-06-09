using System.IO;
using Mixeo.Desktop.Models;

namespace Mixeo.Desktop.Services;

public class FolderWatcherService
{
    public List<Mp3File> ScanFolder(string folder)
    {
        var files =
            Directory.GetFiles(
                folder,
                "*.mp3"
            );

        return files
            .Select(file =>
                new Mp3File
                {
                    Title =
                        Path.GetFileNameWithoutExtension(file),

                    AbsolutePath =
                        Path.GetFullPath(file)
                })
            .ToList();
    }
}