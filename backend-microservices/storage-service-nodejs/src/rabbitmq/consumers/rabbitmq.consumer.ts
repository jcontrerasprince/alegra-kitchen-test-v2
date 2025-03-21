import { RabbitMQConfig } from "../../config/rabbitmq.config";
import { AppService } from "../../services/app.service";
import { handleMessage } from "../rabbitmq.handlers";

export class RabbitMQConsumer {
  static async consume(queue: string, appService: AppService) {
    const connection = await RabbitMQConfig.getConnection();
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: true });

    console.log(`[RabbitMQ] Escuchando en la cola: ${queue}`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());
        const { pattern, data } = message;
        console.log("Mensaje recibido:", message);

        console.log(`Mensaje recibido - Pattern: ${pattern}`);

        const response = await handleMessage(pattern, data, appService);

        // Enviar respuesta a cola de respuesta
        if (msg.properties.replyTo) {
          console.log(`[RabbitMQ] Enviando respuesta a ${msg.properties.replyTo}`);

          channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify(response)), 
            { correlationId: msg.properties.correlationId } // Para que el emisor sepa que esta respuesta es suya
          );
        }

        channel.ack(msg);
      } catch (error) {
        console.error(`Error procesando el mensaje:`, error);
        channel.nack(msg, false, false);
      }
    });
  }
}
