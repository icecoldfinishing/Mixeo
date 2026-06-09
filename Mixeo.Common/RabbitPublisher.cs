using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace Mixeo.Common;

public static class RabbitPublisher
{
    public static async Task PublishMessageAsync(string queueName, string message)
    {
        var factory = RabbitConfig.CreateConnectionFactory();
        using var connection = await factory.CreateConnectionAsync();
        using var channel = await connection.CreateChannelAsync();

        await channel.QueueDeclareAsync(
            queue: queueName,
            durable: false,
            exclusive: false,
            autoDelete: false
        );

        var body = Encoding.UTF8.GetBytes(message);
        await channel.BasicPublishAsync(
            exchange: string.Empty,
            routingKey: queueName,
            body: body
        );
    }

    public static async Task PublishJsonAsync<T>(string queueName, T obj)
    {
        var json = JsonSerializer.Serialize(obj);
        await PublishMessageAsync(queueName, json);
    }
}