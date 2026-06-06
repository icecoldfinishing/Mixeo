using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.Windows.Threading;
using SoundFlow.Desktop.Models;
using SoundFlow.Desktop.Services;

namespace SoundFlow.Desktop;

public partial class MainWindow : Window
{
    private string selectedFolder = "";

    private FolderWatcherService watcher =
        new();

    private DispatcherTimer timer =
        new();

    private QueueService? queueService;
    private MetadataService metadataService = new();
    private UploaderService uploaderService = new();

    public MainWindow()
    {
        InitializeComponent();

        timer.Interval =
            TimeSpan.FromMinutes(5);

        timer.Tick += ScanFolder;

        Loaded += MainWindow_Loaded;
        Closed += MainWindow_Closed;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        LoggingService.Log("App", "Application launched.");
        queueService = new QueueService();
        await queueService.InitializeAsync();

        // 1. Consumer for "mp3-discovered" -> extracts metadata -> publishes to "mp3-extracted"
        await queueService.RegisterConsumerAsync("mp3-discovered", async (filePath) =>
        {
            LoggingService.Log("Program2-Extract", $"Processing file: {filePath}");
            if (!System.IO.File.Exists(filePath))
            {
                LoggingService.Log("Program2-Extract", $"File not found, skipping: {filePath}");
                return;
            }

            try
            {
                var meta = metadataService.Extract(filePath);
                var json = System.Text.Json.JsonSerializer.Serialize(meta);
                LoggingService.Log("Program2-Extract", $"Extracted tags for {meta.Title}. Publishing to mp3-extracted.");
                await queueService.PublishAsync("mp3-extracted", json);
            }
            catch (Exception ex)
            {
                LoggingService.Log("Program2-Extract", $"Error extracting tags from {filePath}: {ex.Message}");
                throw; // Requeue
            }
        });

        // 2. Consumer for "mp3-extracted" -> calls API -> deletes file on success
        await queueService.RegisterConsumerAsync("mp3-extracted", async (jsonPayload) =>
        {
            LoggingService.Log("Program3-Upload", $"Processing metadata payload.");
            Mp3Metadata? meta = null;
            try
            {
                meta = System.Text.Json.JsonSerializer.Deserialize<Mp3Metadata>(jsonPayload);
            }
            catch (Exception ex)
            {
                LoggingService.Log("Program3-Upload", $"JSON parsing failed: {ex.Message}");
                return; // Discard invalid message
            }

            if (meta == null) return;

            bool success = await uploaderService.UploadAndCleanupAsync(meta);
            if (!success)
            {
                LoggingService.Log("Program3-Upload", $"Failed to upload metadata/file for {meta.Title}. Requeuing.");
                throw new Exception("Upload failed, requeue message.");
            }
        });
    }

    private void MainWindow_Closed(object? sender, EventArgs e)
    {
        queueService?.Dispose();
    }

    private void SelectFolder_Click(
        object sender,
        RoutedEventArgs e)
    {
        var dialog =
            new Microsoft.Win32.OpenFolderDialog();

        bool? result =
            dialog.ShowDialog();

        if (result == true)
        {
            selectedFolder =
                dialog.FolderName;

            FolderText.Text =
                selectedFolder;

            ScanNow();

            timer.Start();
        }
    }
    private void Mp3Grid_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (Mp3Grid.SelectedItem == null)
            return;

        var selected = Mp3Grid.SelectedItem;

        var pathProperty = selected.GetType().GetProperty("AbsolutePath");

        if (pathProperty == null)
            return;

        string? path = pathProperty.GetValue(selected)?.ToString();
        if (string.IsNullOrEmpty(path) || !System.IO.File.Exists(path))
            return;

        var service = new MetadataService();
        var meta = service.Extract(path);

        TitleText.Text = meta.Title;
        AlbumText.Text = meta.Album;
        ArtistText.Text = meta.Artist;
        GenreText.Text = meta.Genre;
        YearText.Text = meta.Year.ToString();
        DurationText.Text = meta.Duration.ToString() + " sec";
    }

    private void ScanFolder(
        object? sender,
        EventArgs e)
    {
        ScanNow();
    }

    private async void ScanNow()
    {
        if (
            string.IsNullOrWhiteSpace(
                selectedFolder
            )
        )
            return;

        LoggingService.Log("Program1-Scan", $"Scanning folder: {selectedFolder}");
        var files =
            watcher.ScanFolder(
                selectedFolder
            );

        Mp3Grid.ItemsSource =
            files;

        if (queueService == null) return;

        foreach (var file in files)
        {
            LoggingService.Log("Program1-Scan", $"Discovered file: {file.AbsolutePath}. Publishing to mp3-discovered.");
            await queueService.PublishAsync("mp3-discovered", file.AbsolutePath);
        }
    }
}