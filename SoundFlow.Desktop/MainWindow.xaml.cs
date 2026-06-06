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

    public MainWindow()
    {
        InitializeComponent();

        timer.Interval =
            TimeSpan.FromMinutes(5);

        timer.Tick += ScanFolder;
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

        string path = pathProperty.GetValue(selected)?.ToString();

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

    private void ScanNow()
    {
        if (
            string.IsNullOrWhiteSpace(
                selectedFolder
            )
        )
            return;

        var files =
            watcher.ScanFolder(
                selectedFolder
            );

        Mp3Grid.ItemsSource =
            files;

        var service =
            new MetadataService();

        foreach (var x in files)
        {
            var meta =
            service.Extract(
            x.AbsolutePath
            );

            Console.WriteLine(
            meta.Title
            );
        }
    }
}