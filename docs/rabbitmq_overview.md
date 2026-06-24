# RabbitMQ Overview for Mixeo

## What is RabbitMQ?
RabbitMQ is a **robust, open‑source message broker** that implements the AMQP (Advanced Message Queuing Protocol). It enables **asynchronous communication** between independent components by **decoupling producers and consumers**.

## Core Concepts
| Concept | Description |
|---|---|
| **Exchange** | Receives messages from producers and routes them to queues based on **bindings** and **routing keys**. Types used in Mixeo: `direct` (default) and `fanout`.
| **Queue** | Stores messages until a consumer retrieves them. In Mixeo we have queues for **metadata** (`metadata_queue`) and **file paths** (`file_path_queue`). |
| **Binding** | Links an exchange to a queue, optionally filtering by routing key.
| **Routing Key** | Determines which queue a message should be delivered to. |
| **Consumer** | Reads messages from a queue, processes them, and acknowledges (ACK/NACK).
| **Publisher** | Sends messages to an exchange with a routing key.

## RabbitMQ in Mixeo
The project uses RabbitMQ for two main pipelines:
1. **Program 1** – publishes discovered MP3 file paths.
2. **Program 2** – consumes those paths, extracts metadata, then publishes metadata for downstream services.

### Publisher (`RabbitPublisher.cs` in `Mixeo.Common`)
```csharp
using RabbitMQ.Client;

public static class RabbitPublisher
{
    public static void Publish(string queueName, string message)
    {
        var factory = new ConnectionFactory { HostName = RabbitConfig.Host };
        using var connection = factory.CreateConnection();
        using var channel = connection.CreateModel();
        var body = System.Text.Encoding.UTF8.GetBytes(message);
        channel.BasicPublish(exchange: "",
                         routingKey: queueName,
                         basicProperties: null,
                         body: body);
        FileLogger.Log("RabbitMQ", $"[RABBITMQ] Publish to '{queueName}': {message}");
    }
}
```
*The publisher is used in `MainWindow.xaml.cs` (Program 1) and in the metadata extraction flow (Program 2).* 

### Consumer (`UploaderService.cs` and `MainWindow.xaml.cs`)
```csharp
var factory = new ConnectionFactory { HostName = RabbitConfig.Host };
using var connection = factory.CreateConnection();
using var channel = connection.CreateModel();
var consumer = new EventingBasicConsumer(channel);
consumer.Received += (model, ea) =>
{
    var body = ea.Body.ToArray();
    var message = Encoding.UTF8.GetString(body);
    // Process message …
    channel.BasicAck(ea.DeliveryTag, multiple: false);
    FileLogger.Log("Program2", $"[RABBITMQ] Consume from queue: {message}");
};
channel.BasicConsume(queue: RabbitConfig.QueueFilePath, autoAck: false, consumer: consumer);
```
*Program 2 logs both successful ACKs and NACKs (e.g., when a file is missing).*

## Configuration
### Docker (quick start)
```bash
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management
```
- **5672** – AMQP port used by the .NET clients.
- **15672** – Management UI (http://localhost:15672, default credentials *guest/guest*).

### Docker‑Compose (used in the repository)
```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management
    container_name: rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  rabbitmq_data:
```
Running `docker-compose up -d` brings up the broker with persistent storage.

## Message Flow in Mixeo
```mermaid
flowchart LR
    A[FolderWatcherService] -->|Publish path| B(RabbitMQ Exchange)
    B --> C[Queue: file_path_queue]
    C --> D[Program 2 (MainWindow)]
    D -->|Extract metadata| E[MetadataService]
    E -->|Publish metadata| B
    B --> F[Queue: metadata_queue]
    F --> G[Other consumers (e.g., API, analytics)]
```
1. **FolderWatcherService** scans a folder, filters blacklisted artists/genres, and publishes each valid file path.
2. **Program 2** consumes the path, extracts metadata, and publishes the metadata.
3. Downstream services (API, analytics, etc.) consume the metadata for further processing.

## Helpful Tips
- **Idempotency** – Ensure your consumer ACKs only after successful processing to avoid duplicate handling.
- **Dead‑letter queues** – Configure a dead‑letter exchange for messages that repeatedly NACK (not covered here but useful for production).
- **Monitoring** – Use the RabbitMQ Management UI to view queue depths, message rates, and connections.
- **Connection reuse** – In high‑throughput scenarios, keep a single `IConnection` alive rather than opening/closing per publish.

---
*This document lives in `docs/rabbitmq_overview.md` and is referenced by the project README for developers needing to understand the messaging layer.*
