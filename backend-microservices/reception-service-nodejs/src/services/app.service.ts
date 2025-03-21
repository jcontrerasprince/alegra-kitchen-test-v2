import { RabbitMQProducer } from "../rabbitmq/producers/rabbitmq.producer";
import AppDataSource from "../config/ormconfig";
import { Order } from "../entities/Order";
import { MoreThanOrEqual } from "typeorm";
import { getNowMinusMinutes } from "../utils";
import { meals } from "../constants/meals";

export class AppService {
  private orderRepository = AppDataSource.getRepository(Order);
  MINUTES_TO_SUBSTRACT = 30;

  async createOrder(): Promise<Record<string, any>> {
    console.log('Inicio de create_order...');

    const lastOrders = await this.orderRepository.findBy({
      createdAt: MoreThanOrEqual(getNowMinusMinutes(this.MINUTES_TO_SUBSTRACT)),
    });

    if (lastOrders.length > 10) {
      throw new Error('Too many orders in too little time');
    }

    const orderId = `order_${Date.now()}`;

    const mealsMax = meals.length;
    const meal = meals[Math.floor(Math.random() * (mealsMax - 1))];

    const order = { orderId, mealName: meal.mealName };

    await this.orderRepository.save({
      orderId: order.orderId,
      mealName: order.mealName,
      status: 'PENDING',
    });

    await RabbitMQProducer.emitEvent("kitchen", { pattern: "order_created", data: order });

    console.log('Fin de create_order...');
    return order;
  }

  async getOrders(): Promise<Array<Record<string, any>>> {
    console.log('Método de getOrders...');

    return this.orderRepository.find({
      where: [
        {
          status: 'PENDING',
        },
        {
          status: 'COMPLETED',
          createdAt: MoreThanOrEqual(
            getNowMinusMinutes(this.MINUTES_TO_SUBSTRACT),
          ),
        },
      ],
      order: { id: 'ASC' },
    });
  }

  async updateOrder(order: any) {
    console.log('Método de UpdateOrder...');
    await RabbitMQProducer.emitEvent("api-gateway", { pattern: "order_updated", data: order });
    return this.orderRepository.update(
      { orderId: order.orderId },
      { status: order.status },
    );
  }

  async retryPendingOrders() {
    console.log('Método de retryPendingOrders...');
    const pendingOrders = await this.orderRepository.findBy({
      status: 'PENDING',
    });

    console.log(
      `Órdenes a reintentar: ${JSON.stringify(pendingOrders.map((o) => o.orderId))}`,
    );

    await RabbitMQProducer.emitEvent("kitchen", { pattern: "retry_pending_orders", data: pendingOrders });
  }

  async resetOrders(): Promise<void> {
    console.log('Método de resetOrders...');
    await this.orderRepository.delete({});
  }
}
