import amqp, { Channel, ChannelModel } from "amqplib";

export class RabbitMQConfig {
  private static connection: ChannelModel | null = null;
  private static channel: Channel | null = null;
  private static reconnectAttempts = 0;
  private static readonly maxReconnectAttempts = 5;
  private static readonly reconnectTimeout = 5000; // 5 segundos

  public static async getConnection(): Promise<ChannelModel> {
    if (this.connection) return this.connection;
    return this.connect();
  }

  public static async getChannel(): Promise<Channel> {
    if (this.channel) return this.channel;

    const connection = await this.getConnection();
    this.channel = await connection.createChannel();
    return this.channel;
  }

  private static async connect(): Promise<ChannelModel> {
    try {
      console.log("Conectando a RabbitMQ...");
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");

      this.connection.on("error", async (err) => {
        console.error("Error en la conexión de RabbitMQ:", err.message);
        await this.closeConnection();
        this.reconnect();
      });

      this.connection.on("close", () => {
        console.warn("Conexión cerrada, intentando reconectar...");
        this.closeConnection();
        this.reconnect();
      });

      console.log("Conectado a RabbitMQ");
      this.reconnectAttempts = 0;
      return this.connection;
    } catch (error) {
      console.error("⚠ Error al conectar con RabbitMQ:", error.message);
      this.reconnect();
      throw error;
    }
  }

  private static async closeConnection() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (err) {
      console.error("Error al cerrar la conexión de RabbitMQ:", err.message);
    }
  }

  private static reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Se agotaron los intentos de reconexión.");
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reintentando conexión a RabbitMQ (${this.reconnectAttempts}/${this.maxReconnectAttempts}) en ${this.reconnectTimeout / 1000} segundos...`);
    
    setTimeout(() => {
      this.connect().catch((err) => console.error("Fallo el reintento de conexión:", err.message));
    }, this.reconnectTimeout);
  }
}