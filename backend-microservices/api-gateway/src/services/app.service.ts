import { Server } from "socket.io";
import { RabbitMQProducer } from "../rabbitmq/producers/rabbitmq.producer";
import axios from "axios";
import "dotenv/config";

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
    const result = await RabbitMQProducer.sendRPCRequest("reception", {
      pattern: "get_orders",
    });
    if (!result.success) {
      throw new Error(result?.error || "Server Error");
    }
    return result.data;
  }

  async getStorage(): Promise<any[]> {
    const result = await RabbitMQProducer.sendRPCRequest("storage", {
      pattern: "get_storage",
    });
    if (!result.success) {
      throw new Error(result?.error || "Server Error");
    }
    return result.data;
  }

  async createOrder(): Promise<any> {
    const result = await RabbitMQProducer.sendRPCRequest("reception", {
      pattern: "create_order",
    });
    if (!result.success) {
      throw new Error(result?.error || "Server Error");
    }
    return result.data;
  }

  async getPreparations(): Promise<any[]> {
    const result = await RabbitMQProducer.sendRPCRequest("kitchen", {
      pattern: "get_preparations",
    });
    if (!result.success) {
      throw new Error(result?.error || "Server Error");
    }
    return result.data;
  }

  async getPurchasedIngredients(): Promise<any[]> {
    const result = await RabbitMQProducer.sendRPCRequest("storage", {
      pattern: "get_purchased_ingredients",
    });
    if (!result.success) {
      throw new Error(result?.error || "Server Error");
    }
    return result.data;
  }

  async getMeals(): Promise<any[]> {
    const result = await RabbitMQProducer.sendRPCRequest("kitchen", {
      pattern: "get_meals",
    });
    if (!result.success) {
      throw new Error(result?.error || "Server Error");
    }
    return result.data;
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
    status: "COMPLETED" | "FAILED" | "PENDING" | "IN PROGRESS";
  }): Promise<void> {
    this.io.emit("orderUpdated", orderUpdated);
  }

  // HEALTH CHECKS

  async getHealthCheckReception() {
    const URL_RECEPTION_SERVICE_HC = process.env.URL_RECEPTION_SERVICE_HC || "";
    const { data } = await axios.get(URL_RECEPTION_SERVICE_HC);
    return data;
  }

  async getHealthCheckKitchen() {
    const URL_KITCHEN_SERVICE_HC = process.env.URL_KITCHEN_SERVICE_HC || "";
    const { data } = await axios.get(URL_KITCHEN_SERVICE_HC);
    return data;
  }

  async getHealthCheckStorage() {
    const URL_STORAGE_SERVICE_HC = process.env.URL_STORAGE_SERVICE_HC || "";
    const { data } = await axios.get(URL_STORAGE_SERVICE_HC);
    return data;
  }
}
