using RabbitMQ.Client;

namespace Mixeo.Common;

public static class RabbitConfig
{
    public const string HostName = "localhost";
    public const int Port = 5672;
    public const string UserName = "guest";
    public const string Password = "guest";

    public const string QueueFiles = "mp3.files";
    public const string QueueMetadata = "mp3.metadata";
    public const string QueueProcessedFiles = "mp3.processed";

    public static ConnectionFactory CreateConnectionFactory()
    {
        return new ConnectionFactory
        {
            HostName = HostName,
            Port = Port,
            UserName = UserName,
            Password = Password
        };
    }
}