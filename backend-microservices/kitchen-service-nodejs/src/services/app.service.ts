import { RabbitMQProducer } from "../rabbitmq/producers/rabbitmq.producer";
import AppDataSource from "../config/ormconfig";
import { MoreThanOrEqual } from "typeorm";
import { checkerEveryElementExist, getNowMinusMinutes } from "../utils";
import { meals } from "../constants/meals";
import { Preparation } from "../entities/Preparation";
import { preparationsQueue } from "../queues/queue";
import { Job } from "bullmq";

export class AppService {
  private preparationRepository = AppDataSource.getRepository(Preparation);
  MINUTES_TO_SUBSTRACT = 30;

  async createPreparation(order: {
    orderId: string;
    meals: { mealName: string; qty: number }[];
  }) {
    console.log("Inicio de createPreparation");

    const mealChecker = checkerEveryElementExist(
      meals.map((m) => m.mealName),
      order.meals.map((m) => m.mealName)
    );

    if (!mealChecker) {
      throw new Error("No meal");
    }

    const jobs: Job[] = [];
    for (const meal of order.meals) {
      const mealIngredients = meals.find((m) => m.mealName === meal.mealName)!;

      for (let i = 1; i <= meal.qty; i++) {
        const preparation = await this.preparationRepository.save({
          orderId: order.orderId,
          mealName: meal.mealName,
          status: "PENDING",
        });

        const preparationAndIngredients = {
          ...preparation,
          ingredients: mealIngredients.ingredients,
        };

        const job = await preparationsQueue.add(
          "prepare",
          preparationAndIngredients
        );
        jobs.push(job);
      }
    }

    console.log("Fin de createPreparation (job enviado a cola)");
    return jobs;
  }

  async getPreparations() {
    console.log("Método de getPreparations");
    return this.preparationRepository.find({ order: { createdAt: "DESC" } });
  }

  async retryPendingOrders(orders: { orderId: string }[]) {
    console.log("Inicio de retryPendingOrders");
    if (orders && orders.length === 0) {
      return;
    }
    const pendingPreparations = await this.preparationRepository.find({
      where: orders.map((order) => ({ orderId: order.orderId })),
    });

    for (let i = 0; i < pendingPreparations.length; i++) {
      const pendingPreparation = pendingPreparations[i];

      const meal = meals.find(
        (meal) => meal.mealName === pendingPreparation.mealName
      );

      if (!meal) {
        continue;
      }

      await preparationsQueue.add("prepare", {
        ...pendingPreparation,
        ingredients: meal.ingredients,
      });
    }
    console.log("Fin de retryPendingOrders");
    return;
  }

  async resetPreparations(): Promise<void> {
    console.log("Método de resetPreparations");
    await this.preparationRepository.delete({});
  }

  async getMeals(): Promise<any> {
    console.log("Método de resetPreparations");
    return meals;
  }
}
