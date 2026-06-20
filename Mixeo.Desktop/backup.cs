using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using Mixeo.Common;
using Mixeo.Desktop.Models;
using Mixeo.Desktop.Services;

namespace Mixeo.Desktop;

public partial class MainWindow : Window
{
    private string selectedFolder = "";

    private readonly FolderWatcherService watcher = new();
    private readonly DispatcherTimer timer = new();
    private readonly MetadataService metadataService = new();

    public MainWindow()
    {
        InitializeComponent();

        timer.Interval = TimeSpan.FromMinutes(1);
        timer.Tick += ScanFolder;

        // Start Program 2 as a background worker
        StartProgram2();
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

        // Run Program 1 in background: publish file paths to RabbitMQ
        Task.Run(async () =>
        {
            FileLogger.Log("program1", $"--- Started folder scan: {selectedFolder} ---");
            foreach (var file in files)
            {
                if (File.Exists(file.AbsolutePath))
                {
                    try
                    {
                        FileLogger.Log("Program1", $"[RABBITMQ] Requesting publish for file path: {file.AbsolutePath}");
                        await RabbitPublisher.PublishMessageAsync(RabbitConfig.QueueFiles, file.AbsolutePath);
                        FileLogger.Log("Program1", $"[RABBITMQ] Successfully requested publish for: {file.AbsolutePath}");
                    }
                    catch (Exception ex)
                    {
                        FileLogger.Log("program1", $"Error publishing {file.AbsolutePath}: {ex.Message}");
                    }
                }
            }
            FileLogger.Log("program1", $"--- Folder scan complete. Found {files.Count} files. ---");
        });
    }

    private void StartProgram2()
    {
        Task.Run(async () =>
        {
            FileLogger.Log("program2", "Program 2 worker starting...");
            try
            {
                var factory = RabbitConfig.CreateConnectionFactory();
                var connection = await factory.CreateConnectionAsync();
                var channel = await connection.CreateChannelAsync();

                await channel.QueueDeclareAsync(
                    queue: RabbitConfig.QueueFiles,
                    durable: false,
                    exclusive: false,
                    autoDelete: false
                );

                await channel.QueueDeclareAsync(
                    queue: RabbitConfig.QueueMetadata,
                    durable: false,
                    exclusive: false,
                    autoDelete: false
                );

                var consumer = new AsyncEventingBasicConsumer(channel);
                consumer.ReceivedAsync += async (sender, e) =>
                {
                    var path = Encoding.UTF8.GetString(e.Body.ToArray());
                    FileLogger.Log("Program2", $"[RABBITMQ] Consume from queue: {path}");

                    if (File.Exists(path))
                    {
                        try
                        {
                            var meta = metadataService.Extract(path);
                            FileLogger.Log("program2", $"Extracted metadata for: {path} (Title: '{meta.Title}', Artist: '{meta.Artist}')");

                            await RabbitPublisher.PublishJsonAsync(RabbitConfig.QueueMetadata, meta);
                            FileLogger.Log("Program2", $"[RABBITMQ] Publish metadata to {RabbitConfig.QueueMetadata} for: {path}");

                            FileLogger.Log("Program2", $"[RABBITMQ] ACK message for: {path}");
                            await channel.BasicAckAsync(e.DeliveryTag, multiple: false);
                        }
                        catch (Exception ex)
                        {
                            FileLogger.Log("Program2", $"[RABBITMQ] NACK message for {path}: Error processing - {ex.Message}");
                            await channel.BasicNackAsync(e.DeliveryTag, multiple: false, requeue: false);
                        }
                    }
                    else
                    {
                        FileLogger.Log("Program2", $"[RABBITMQ] ACK message (File not found, skipping): {path}");
                        await channel.BasicAckAsync(e.DeliveryTag, multiple: false);
                    }
                };

                await channel.BasicConsumeAsync(
                    queue: RabbitConfig.QueueFiles,
                    autoAck: false,
                    consumer: consumer
                );

                FileLogger.Log("program2", "Program 2 worker is listening on queue: " + RabbitConfig.QueueFiles);
            }
            catch (Exception ex)
            {
                FileLogger.Log("program2", $"Program 2 worker failed to start: {ex.Message}");
            }
        });
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