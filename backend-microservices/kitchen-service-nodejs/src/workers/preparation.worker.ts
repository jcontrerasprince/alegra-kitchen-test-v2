import { Worker, Job } from "bullmq";

import { redisConfig } from "../config/redis.config";
import { RabbitMQProducer } from "../rabbitmq/producers/rabbitmq.producer";
import AppDataSource from "../config/ormconfig";
import { Preparation } from "../entities/Preparation";

const preparationRepository = AppDataSource.getRepository(Preparation);

const worker = new Worker(
  "preparationsQueue",
  async (
    job: Job<{
      orderId: string;
      mealName: string;
      ingredients: { ingredientName: string; qty: number }[];
    }>
  ) => {
    console.log(`Procesando job: ${job.name}`);

    switch (job.name) {
      case "prepare": {
        console.log(`Preparando comida: ${job.data.mealName}`);

        const order = await preparationRepository.findOneBy({
          orderId: job.data.orderId,
        });
        if (!order) {
          throw new Error("Order not found");
        }

        // Verificar disponibilidad de ingredientes en storage
        const ingredientsAvailable = await requestIngredients(job.data);

        if (!ingredientsAvailable) {
          console.log(
            `Orden ${job.data.orderId} queda PENDING por falta de ingredientes.`
          );

          await RabbitMQProducer.emitEvent("reception", {
            pattern: "order_updated",
            data: { orderId: order.orderId, status: "PENDING" },
          });

          return {
            success: true,
            message: `Orden ${job.data.orderId} queda PENDING`,
          };
        }

        await preparationRepository.update(order.id, {
          status: "COMPLETED",
        });

        // Notificar a recepción que la orden está lista
        await RabbitMQProducer.emitEvent("reception", {
          pattern: "order_updated",
          data: { orderId: order.orderId, status: "COMPLETED" },
        });

        console.log(
          `Preparación completada: ${job.data.mealName} para la orden ${job.data.orderId}`
        );
        return { success: true, message: `Comida ${job.data.mealName} lista` };
      }
    }
  },
  { connection: redisConfig }
);

// Listeners del worker
worker.on("completed", (job) => {
  console.log(`Job completado: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job fallido: ${job?.id}`, err);
});

const requestIngredients = async (order: {
  orderId: string;
  ingredients: { ingredientName: string; qty: number }[];
}) => {
  console.log("Inicio de requestIngredients...");
  const marketResponse = await RabbitMQProducer.sendRPCRequest("storage", {
    pattern: "request_ingredients",
    data: order,
  });

  console.log(`Fin de requestIngredients (${order.orderId})...`);
  return marketResponse;
};

export default worker;
