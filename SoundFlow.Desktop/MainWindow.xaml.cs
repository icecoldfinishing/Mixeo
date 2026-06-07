using System;
using System.IO;
using System.Windows;
using System.Windows.Threading;
using SoundFlow.Desktop.Models;
using SoundFlow.Desktop.Services;

namespace SoundFlow.Desktop;

public partial class MainWindow : Window
{
    private string selectedFolder = "";

    private readonly FolderWatcherService watcher = new();
    private readonly DispatcherTimer timer = new();
    private readonly MetadataService metadataService = new();

    public MainWindow()
    {
        InitializeComponent();

        timer.Interval = TimeSpan.FromMinutes(5);
        timer.Tick += ScanFolder;
    }

    private void SelectFolder_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new Microsoft.Win32.OpenFolderDialog();

        if (dialog.ShowDialog() == true)
        {
            selectedFolder = dialog.FolderName;
            FolderText.Text = selectedFolder;

            ScanNow();
            timer.Start();
        }
    }

    private void ScanFolder(object? sender, EventArgs e)
    {
        ScanNow();
    }

    private void ScanNow()
    {
        if (string.IsNullOrWhiteSpace(selectedFolder))
            return;

        var files = watcher.ScanFolder(selectedFolder);

        Mp3Grid.ItemsSource = files;
    }

    private void Mp3Grid_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
    {
        if (Mp3Grid.SelectedItem == null)
            return;

        var selected = Mp3Grid.SelectedItem;

        var pathProperty = selected.GetType().GetProperty("AbsolutePath");
        if (pathProperty == null) return;

        string? path = pathProperty.GetValue(selected)?.ToString();

        if (string.IsNullOrEmpty(path) || !File.Exists(path))
            return;

        var meta = metadataService.Extract(path);

        TitleText.Text = meta.Title;
        AlbumText.Text = meta.Album;
        ArtistText.Text = meta.Artist;
        GenreText.Text = meta.Genre;
        YearText.Text = meta.Year.ToString();
        DurationText.Text = meta.Duration + " sec";
    }
}