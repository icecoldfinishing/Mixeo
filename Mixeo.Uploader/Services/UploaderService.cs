using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using Mixeo.Common;

namespace Mixeo.Uploader.Services;

public class UploaderService
{
    private readonly HttpClient _http = new();
    private const string ProgramName = "program3";

    public async Task StartAsync()
    {
        try
        {
            var factory = RabbitConfig.CreateConnectionFactory();
            var connection = await factory.CreateConnectionAsync();
            var channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(
                queue: RabbitConfig.QueueMetadata,
                durable: false,
                exclusive: false,
                autoDelete: false
            );

            FileLogger.Log(ProgramName, $"Listening on queue: {RabbitConfig.QueueMetadata}");
            Console.WriteLine($"👂 Listening queue: {RabbitConfig.QueueMetadata}");

            var consumer = new AsyncEventingBasicConsumer(channel);

            consumer.ReceivedAsync += async (sender, e) =>
            {
                var json = Encoding.UTF8.GetString(e.Body.ToArray());
                var meta = JsonSerializer.Deserialize<Mp3Metadata>(json);

                if (meta == null)
                {
                    FileLogger.Log(ProgramName, "Received invalid message (null metadata).");
                    await channel.BasicAckAsync(e.DeliveryTag, false);
                    return;
                }

                FileLogger.Log(ProgramName, $"Received metadata for: {meta.Title} (File: {meta.Path})");
                Console.WriteLine($"📦 Received: {meta.Title}");

                bool ok = await UploadToApi(meta);

                if (ok)
                {
                    FileLogger.Log(ProgramName, $"✅ Upload success: {meta.Title}");
                    Console.WriteLine($"✅ Uploaded: {meta.Title}");

                    try
                    {
                        if (File.Exists(meta.Path))
                        {
                            File.Delete(meta.Path);
                            FileLogger.Log(ProgramName, $"🗑 Deleted original file: {meta.Path}");
                            Console.WriteLine($"🗑 Deleted file: {meta.Path}");
                        }
                        else
                        {
                            FileLogger.Log(ProgramName, $"⚠️ File already gone: {meta.Path}");
                        }
                    }
                    catch (Exception ex)
                    {
                        FileLogger.Log(ProgramName, $"❌ Delete error for {meta.Path}: {ex.Message}");
                        Console.WriteLine($"❌ Delete error: {ex.Message}");
                    }
                }
                else
                {
                    FileLogger.Log(ProgramName, $"❌ Upload failed: {meta.Title}");
                    Console.WriteLine($"❌ Upload failed: {meta.Title}");
                }

                await channel.BasicAckAsync(e.DeliveryTag, false);
            };

            await channel.BasicConsumeAsync(
                queue: RabbitConfig.QueueMetadata,
                autoAck: false,
                consumer: consumer
            );
        }
        catch (Exception ex)
        {
            FileLogger.Log(ProgramName, $"Critical Error: {ex.Message}");
            Console.WriteLine($"❌ Critical Error: {ex.Message}");
        }
    }

    private async Task<bool> UploadToApi(Mp3Metadata meta)
    {
        try
        {
            var content = new MultipartFormDataContent();

            content.Add(new StringContent(meta.Title ?? ""), "title");
            content.Add(new StringContent(meta.Artist ?? ""), "artist");
            content.Add(new StringContent(meta.Album ?? ""), "album");
            content.Add(new StringContent(meta.Genre ?? ""), "genre");
            content.Add(new StringContent(meta.Year.ToString()), "year");
            content.Add(new StringContent(meta.Duration.ToString()), "duration");

            if (!File.Exists(meta.Path))
            {
                FileLogger.Log(ProgramName, $"Upload aborted: File not found at {meta.Path}");
                return false;
            }

            var fileBytes = await File.ReadAllBytesAsync(meta.Path);
            var fileContent = new ByteArrayContent(fileBytes);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("audio/mpeg");

            content.Add(fileContent, "file", Path.GetFileName(meta.Path));
            
            var response = await _http.PostAsync("http://localhost:5021/api/mp3/upload", content);
            FileLogger.Log(ProgramName, $"API POST {meta.Title} - Status: {response.StatusCode}");
            
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            FileLogger.Log(ProgramName, $"Upload exception for {meta.Title}: {ex.Message}");
            return false;
        }
    }
}