import { RabbitMQConfig } from "../../config/rabbitmq.config";

export class RabbitMQProducer {
  /**
   * Envía una solicitud RPC a una cola de RabbitMQ y espera una respuesta.
   * @param queue Nombre de la cola de RabbitMQ.
   * @param message Mensaje a enviar.
   * @returns Respuesta del microservicio.
   */
  static async sendRPCRequest(queue: string, message: any = {}): Promise<any> {
    const connection = await RabbitMQConfig.getConnection();
    const channel = await connection.createChannel();
    const correlationId = Math.random().toString();
    const replyQueue = await channel.assertQueue("", {
      exclusive: true,
    });

    return new Promise((resolve, reject) => {
      channel.consume(
        replyQueue.queue,
        async (msg) => {
          if (msg?.properties.correlationId === correlationId) {
            clearTimeout(myTimeout);
            try {
              await channel.deleteQueue(replyQueue.queue);
              await channel.close();
            } catch (err) {
              console.error("Error cerrando canal:", err);
            }
            resolve(JSON.parse(msg.content.toString()));
          }
        },
        { noAck: true }
      );

      channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        correlationId,
        replyTo: replyQueue.queue,
      });

      // Si la respuesta tarda demasiado, rechazar la promesa
      const myTimeout = setTimeout(async () => {
        try {
          await channel.deleteQueue(replyQueue.queue);
          await channel.close();
        } catch (err) {
          console.error("Error cerrando canal tras timeout:", err);
        }
        reject(new Error("Timeout esperando respuesta de " + queue));
      }, 30000);
    });
  }

  static async emitEvent(queue: string, message: any = {}) {
    const connection = await RabbitMQConfig.getConnection();
    const channel = await connection.createChannel();
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
  }
}
