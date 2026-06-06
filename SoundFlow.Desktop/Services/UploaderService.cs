using System;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using SoundFlow.Desktop.Models;

namespace SoundFlow.Desktop.Services;

public class UploaderService
{
    private static readonly HttpClient HttpClient = new() { Timeout = TimeSpan.FromMinutes(5) };
    private const string ApiUrl = "http://localhost:5021/api/mp3/upload"; // Verify your API port if different

    public async Task<bool> UploadAndCleanupAsync(Mp3Metadata metadata)
    {
        LoggingService.Log("Uploader", $"Starting upload for {metadata.Title} (Path: {metadata.Path})");

        if (!File.Exists(metadata.Path))
        {
            LoggingService.Log("Uploader", $"File does not exist: {metadata.Path}");
            return false;
        }

        try
        {
            using var content = new MultipartFormDataContent();

            // Read file stream
            var fileStream = new FileStream(metadata.Path, FileMode.Open, FileAccess.Read);
            var fileContent = new StreamContent(fileStream);
            content.Add(fileContent, "file", Path.GetFileName(metadata.Path));

            // Metadata fields
            content.Add(new StringContent(metadata.Title), "title");
            content.Add(new StringContent(metadata.Artist), "artist");
            content.Add(new StringContent(metadata.Album), "album");
            content.Add(new StringContent(metadata.Genre), "genre");
            content.Add(new StringContent(metadata.Year.ToString()), "year");
            content.Add(new StringContent(metadata.Duration.ToString()), "duration");

            var response = await HttpClient.PostAsync(ApiUrl, content);

            // Clean up the file stream so we can delete the file afterwards if upload is successful
            fileStream.Dispose();

            if (response.IsSuccessStatusCode)
            {
                LoggingService.Log("Uploader", $"Upload successful for {metadata.Title}. Deleting local file.");
                try
                {
                    File.Delete(metadata.Path);
                    LoggingService.Log("Uploader", $"Local file deleted successfully: {metadata.Path}");
                    return true;
                }
                catch (Exception deleteEx)
                {
                    LoggingService.Log("Uploader", $"Failed to delete local file {metadata.Path}: {deleteEx.Message}");
                    return false;
                }
            }
            else
            {
                var errorMsg = await response.Content.ReadAsStringAsync();
                LoggingService.Log("Uploader", $"Upload failed with status code {response.StatusCode}: {errorMsg}");
                return false;
            }
        }
        catch (Exception ex)
        {
            LoggingService.Log("Uploader", $"Error during upload/cleanup: {ex.Message}");
            return false;
        }
    }
}
