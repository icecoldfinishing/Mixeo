using System;
using System.Text;
using System.Threading.Tasks;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace SoundFlow.Desktop.Services;

public class QueueService : IDisposable
{
    private IConnection? _connection;
    private IChannel? _channel;
    private bool _initialized;

    public async Task InitializeAsync()
    {
        if (_initialized) return;

        var factory = new ConnectionFactory { HostName = "localhost" };
        try
        {
            _connection = await factory.CreateConnectionAsync();
            _channel = await _connection.CreateChannelAsync();

            // Declare queues
            await _channel.QueueDeclareAsync(
                queue: "mp3-discovered",
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null
            );

            await _channel.QueueDeclareAsync(
                queue: "mp3-extracted",
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null
            );

            _initialized = true;
            LoggingService.Log("RabbitMQ", "Connection initialized and queues declared successfully.");
        }
        catch (Exception ex)
        {
            LoggingService.Log("RabbitMQ", $"Error initializing connection: {ex.Message}");
        }
    }

    public async Task PublishAsync(string queueName, string message)
    {
        if (!_initialized || _channel == null)
        {
            await InitializeAsync();
        }

        if (_channel == null) return;

        var body = Encoding.UTF8.GetBytes(message);
        var properties = new BasicProperties
        {
            Persistent = true
        };

        await _channel.BasicPublishAsync(
            exchange: string.Empty,
            routingKey: queueName,
            mandatory: true,
            basicProperties: properties,
            body: body
        );

        LoggingService.Log("RabbitMQ", $"Published to {queueName}: {message}");
    }

    public async Task RegisterConsumerAsync(string queueName, Func<string, Task> onMessageReceived)
    {
        if (!_initialized || _channel == null)
        {
            await InitializeAsync();
        }

        if (_channel == null) return;

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (model, ea) =>
        {
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);
            LoggingService.Log("RabbitMQ", $"Received from {queueName}");

            try
            {
                await onMessageReceived(message);
                if (_channel != null)
                {
                    await _channel.BasicAckAsync(deliveryTag: ea.DeliveryTag, multiple: false);
                }
            }
            catch (Exception ex)
            {
                LoggingService.Log("RabbitMQ", $"Error processing message from {queueName}: {ex.Message}");
                // In case of error, we can Nack or reject. Let's requeue if transient, or just don't ack.
                if (_channel != null)
                {
                    await _channel.BasicNackAsync(deliveryTag: ea.DeliveryTag, multiple: false, requeue: true);
                }
            }
        };

        await _channel.BasicConsumeAsync(queue: queueName, autoAck: false, consumer: consumer);
        LoggingService.Log("RabbitMQ", $"Registered consumer for queue: {queueName}");
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
    }
}
