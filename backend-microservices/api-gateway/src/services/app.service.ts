import { Server } from "socket.io";
import { RabbitMQProducer } from "../rabbitmq/producers/rabbitmq.producer";

export class AppService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  getHello(): Record<string, string> {
    return { message: "Hello World!" };
  }

  // Llamadas a las colas correctas
  async getOrders(): Promise<any[]> {
    return RabbitMQProducer.sendRPCRequest("reception", {
      pattern: "get_orders",
    });
  }

  async getStorage(): Promise<any[]> {
    return RabbitMQProducer.sendRPCRequest("storage", {
      pattern: "get_storage",
    });
  }

  async createMeal(): Promise<any[]> {
    return RabbitMQProducer.sendRPCRequest("reception", {
      pattern: "create_preparation",
    });
  }

  async getPreparations(): Promise<any[]> {
    return RabbitMQProducer.sendRPCRequest("kitchen", {
      pattern: "get_preparations",
    });
  }

  async getPurchasedIngredients(): Promise<any[]> {
    return RabbitMQProducer.sendRPCRequest("storage", {
      pattern: "get_purchased_ingredients",
    });
  }

  async getMeals(): Promise<any[]> {
    return RabbitMQProducer.sendRPCRequest("kitchen", { pattern: "get_meals" });
  }

  async resetIngredients() {
    return RabbitMQProducer.emitEvent("storage", {
      pattern: "reset_ingredients",
    });
  }

  async resetOrdersAndPreparations() {
    await Promise.all([
      RabbitMQProducer.emitEvent("reception", { pattern: "reset_orders" }),
      RabbitMQProducer.emitEvent("kitchen", { pattern: "reset_preparations" }),
    ]);
  }

  async orderUpdated(orderUpdated: {
    orderId: string;
    status: "COMPLETED" | "FAILED" | "PENDING";
  }): Promise<void> {
    this.io.emit("orderUpdated", orderUpdated);
  }
}
