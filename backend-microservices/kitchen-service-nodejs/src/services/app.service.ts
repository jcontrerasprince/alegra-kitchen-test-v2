import { RabbitMQProducer } from "../rabbitmq/producers/rabbitmq.producer";
import AppDataSource from "../config/ormconfig";
import { MoreThanOrEqual } from "typeorm";
import { getNowMinusMinutes } from "../utils";
import { meals } from "../constants/meals";
import { Preparation } from "../entities/Preparation";
import { preparationsQueue } from "../queues/queue";

export class AppService {
  private preparationRepository = AppDataSource.getRepository(Preparation);
  MINUTES_TO_SUBSTRACT = 30;

  async createPreparation(order: { orderId: string; mealName: string }) {
    console.log('Inicio de createPreparation');
    const meal = meals.find((meal) => meal.mealName === order.mealName);

    if (!meal) {
      throw new Error('No meal');
    }

    await this.preparationRepository.insert({
      orderId: order.orderId,
      mealName: order.mealName,
      status: 'PENDING',
    });

    const job = await preparationsQueue.add('prepare', {
      ...order,
      ingredients: meal.ingredients,
    });

    console.log('Fin de createPreparation (job enviado a cola)');
    return job;
  }

  async getPreparations() {
    console.log('Método de getPreparations');
    return this.preparationRepository.find({ order: { id: 'DESC' }, take: 10 });
  }

  async retryPendingOrders(orders: { orderId: string }[]) {
    console.log('Inicio de retryPendingOrders');
    if (orders && orders.length === 0) {
      return;
    }
    const pendingPreparations = await this.preparationRepository.find({
      where: orders.map((order) => ({ orderId: order.orderId })),
    });

    for (let i = 0; i < pendingPreparations.length; i++) {
      const pendingPreparation = pendingPreparations[i];

      const meal = meals.find(
        (meal) => meal.mealName === pendingPreparation.mealName,
      );

      if (!meal) {
        continue;
      }

      await preparationsQueue.add('prepare', {
        ...pendingPreparation,
        ingredients: meal.ingredients,
      });
    }
    console.log('Fin de retryPendingOrders');
    return;
  }

  async resetPreparations(): Promise<void> {
    console.log('Método de resetPreparations');
    await this.preparationRepository.delete({});
  }

  async getMeals(): Promise<any> {
    console.log('Método de resetPreparations');
    return meals;
  }
}
