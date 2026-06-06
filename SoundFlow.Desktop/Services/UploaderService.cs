using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using SoundFlow.Desktop.Models;

namespace SoundFlow.Desktop.Services;

public class UploaderService
{
    private readonly HttpClient _http = new();

    public void Start()
    {
        var factory = new ConnectionFactory()
        {
            HostName = "localhost"
        };

        var connection = factory.CreateConnection();
        var channel = connection.CreateModel();

        channel.QueueDeclare(
            queue: "mp3.metadata",
            durable: false,
            exclusive: false,
            autoDelete: false
        );

        var consumer = new EventingBasicConsumer(channel);

        consumer.Received += async (sender, e) =>
        {
            var json = Encoding.UTF8.GetString(e.Body.ToArray());

            var meta = JsonSerializer.Deserialize<Mp3Metadata>(json);

            if (meta == null)
                return;

            Console.WriteLine($"[UPLOAD] {meta.Title}");

            bool ok = await UploadToApi(meta);

            if (ok)
            {
                try
                {
                    File.Delete(meta.Path);
                    Console.WriteLine($"[DELETE] {meta.Path}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ERROR DELETE] {ex.Message}");
                }
            }
        };

        channel.BasicConsume(
            queue: "mp3.metadata",
            autoAck: true,
            consumer: consumer
        );
    }

    private async Task<bool> UploadToApi(Mp3Metadata meta)
    {
        var content = new MultipartFormDataContent();

        content.Add(new StringContent(meta.Title ?? ""), "title");
        content.Add(new StringContent(meta.Album ?? ""), "album");
        content.Add(new StringContent(meta.Artist ?? ""), "artist");
        content.Add(new StringContent(meta.Genre ?? ""), "genre");
        content.Add(new StringContent(meta.Year.ToString()), "year");

        if (!File.Exists(meta.Path))
        {
            Console.WriteLine("[ERROR] file not found");
            return false;
        }

        var bytes = await File.ReadAllBytesAsync(meta.Path);

        content.Add(
            new ByteArrayContent(bytes),
            "file",
            Path.GetFileName(meta.Path)
        );

        var response = await _http.PostAsync(
            "http://localhost:5000/api/mp3/upload",
            content
        );

        Console.WriteLine($"[API] Status: {response.StatusCode}");

        return response.IsSuccessStatusCode;
    }
}