using Mixeo.Uploader.Services;

var service = new UploaderService();
await service.StartAsync();

Console.WriteLine("Uploader started...");
Console.ReadLine();