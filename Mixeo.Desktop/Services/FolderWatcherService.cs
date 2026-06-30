using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using Mixeo.Desktop.Models;
using Mixeo.Common;

namespace Mixeo.Desktop.Services;

public class FolderWatcherService
{
    public List<Mp3File> ScanFolder(string folder)
    {
        var files = Directory.GetFiles(folder, "*.mp3");
        var validFiles = new List<Mp3File>();
        var metadataService = new MetadataService();

        // Load artist blacklist
        var artistBlacklist = new List<string>();
        string artistBlacklistPath = @"d:\L3\GProjet\Mixeo\blacklist\bl_artist.csv";
        if (File.Exists(artistBlacklistPath))
        {
            var text = File.ReadAllText(artistBlacklistPath);
            artistBlacklist = text.Split(',')
                               .Select(n => n.Trim())
                               .Where(n => !string.IsNullOrEmpty(n))
                               .ToList();
        }

        // Load genre blacklist
        var genreBlacklist = new List<string>();
        string genreBlacklistPath = @"d:\L3\GProjet\Mixeo\blacklist\bl_genre.csv";
        if (File.Exists(genreBlacklistPath))
        {
            var text = File.ReadAllText(genreBlacklistPath);
            genreBlacklist = text.Split(',')
                               .Select(n => n.Trim())
                               .Where(n => !string.IsNullOrEmpty(n))
                               .ToList();
        }

        foreach (var file in files)
        {
            try
            {
                var meta = metadataService.Extract(file);
                bool isBlacklisted = false;

                // Check artist blacklist
                if (!string.IsNullOrEmpty(meta.Artist))
                {
                    var artistLower = meta.Artist.ToLowerInvariant();
                    isBlacklisted = artistBlacklist.Any(b => artistLower.Contains(b.ToLowerInvariant()));
                }

                // If not blacklisted by artist, check genre blacklist
                if (!isBlacklisted && !string.IsNullOrEmpty(meta.Genre))
                {
                    var genreLower = meta.Genre.ToLowerInvariant();
                    isBlacklisted = genreBlacklist.Any(b => genreLower.Contains(b.ToLowerInvariant()));
                }

                if (isBlacklisted)
                {
                    FileLogger.Log("program1", $"[BLACKLIST] Suppression du fichier : {file} (Artiste/Genre banni: {meta.Artist ?? meta.Genre})");
                    File.Delete(file);
                }
                else
                {
                    validFiles.Add(new Mp3File
                    {
                        Title = Path.GetFileNameWithoutExtension(file),
                        AbsolutePath = Path.GetFullPath(file)
                    });
                }
            }
            catch (Exception ex)
            {
                FileLogger.Log("program1", $"[ERROR] Impossible de traiter le fichier {file} : {ex.Message}");
                validFiles.Add(new Mp3File
                {
                    Title = Path.GetFileNameWithoutExtension(file),
                    AbsolutePath = Path.GetFullPath(file)
                });
            }
        }

        return validFiles;
    }
}