using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using SoundFlow.Uploader.Models;

namespace SoundFlow.Uploader.Services;

public class UploaderService
{
    private readonly HttpClient _http = new();

    public async Task StartAsync()
    {
        var factory = new ConnectionFactory
        {
            HostName = "localhost",
            Port = 5672,
            UserName = "guest",
            Password = "guest"
        };

        // ✅ RabbitMQ 7.x => async connection
        var connection = await factory.CreateConnectionAsync();
        var channel = await connection.CreateChannelAsync();

        await channel.QueueDeclareAsync(
            queue: "mp3.metadata",
            durable: false,
            exclusive: false,
            autoDelete: false
        );

        Console.WriteLine("👂 Listening queue: mp3.metadata");

        var consumer = new AsyncEventingBasicConsumer(channel);

        consumer.ReceivedAsync += async (sender, e) =>
        {
            var json = Encoding.UTF8.GetString(e.Body.ToArray());

            var meta = JsonSerializer.Deserialize<Mp3Metadata>(json);

            if (meta == null)
            {
                Console.WriteLine("❌ Invalid message");
                return;
            }

            Console.WriteLine($"📦 Received: {meta.Title}");

            bool ok = await UploadToApi(meta);

            if (ok)
            {
                Console.WriteLine($"✅ Uploaded: {meta.Title}");

                try
                {
                    if (File.Exists(meta.Path))
                    {
                        File.Delete(meta.Path);
                        Console.WriteLine($"🗑 Deleted file: {meta.Path}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Delete error: {ex.Message}");
                }
            }
            else
            {
                Console.WriteLine($"❌ Upload failed: {meta.Title}");
            }
        };

        await channel.BasicConsumeAsync(
            queue: "mp3.metadata",
            autoAck: true,
            consumer: consumer
        );
    }

    private async Task<bool> UploadToApi(Mp3Metadata meta)
    {
        try
        {
            var content = new MultipartFormDataContent();

            content.Add(new StringContent(meta.Title ?? ""), "Title");
            content.Add(new StringContent(meta.Artist ?? ""), "Artist");
            content.Add(new StringContent(meta.Album ?? ""), "Album");
            content.Add(new StringContent(meta.Genre ?? ""), "Genre");
            content.Add(new StringContent(meta.Year.ToString()), "Year");
            content.Add(new StringContent(meta.Duration.ToString()), "Duration");

            if (!File.Exists(meta.Path))
                return false;

            var fileBytes = await File.ReadAllBytesAsync(meta.Path);

            var fileContent = new ByteArrayContent(fileBytes);
            fileContent.Headers.ContentType =
                new System.Net.Http.Headers.MediaTypeHeaderValue("audio/mpeg");

            content.Add(fileContent, "file", Path.GetFileName(meta.Path));
            
            var response = await _http.PostAsync(
                "http://localhost:5021/api/mp3/upload",
                content
            );

            Console.WriteLine($"📡 API Response: {response.StatusCode}");

            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Upload exception: {ex.Message}");
            return false;
        }
    }
}