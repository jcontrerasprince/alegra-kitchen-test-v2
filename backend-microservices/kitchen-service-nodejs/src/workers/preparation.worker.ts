import { Worker, Job } from "bullmq";

import { redisConfig } from "../config/redis.config";
import { RabbitMQProducer } from "../rabbitmq/producers/rabbitmq.producer";
import AppDataSource from "../config/ormconfig";
import { Preparation } from "../entities/Preparation";

const preparationRepository = AppDataSource.getRepository(Preparation);

const worker = new Worker(
  "preparationsQueue",
  async (
    job: Job<
      Preparation & {
        ingredients: { ingredientName: string; qty: number }[];
      }
    >
  ) => {
    console.log(`Procesando job: ${job.name}`);

    switch (job.name) {
      case "prepare": {
        console.log(`Preparando comida: ${job.data.mealName}`);

        const preparation = await preparationRepository.findOneBy({
          id: job.data.id,
        });

        if (!preparation) {
          throw new Error("Preparation not found");
        }

        // Verificar disponibilidad de ingredientes en storage
        const ingredientsAvailable = await requestIngredients(job.data);

        if (!ingredientsAvailable) {
          console.log(
            `Preparación ${job.data.orderId} queda PENDING por falta de ingredientes.`
          );

          await RabbitMQProducer.emitEvent("reception", {
            pattern: "order_updated",
            data: { orderId: job.data.orderId, status: "IN PROGRESS" },
          });

          return {
            success: true,
            message: `Preparación ${job.data.orderId} queda PENDING`,
          };
        }

        await preparationRepository.update(job.data.id, {
          status: "COMPLETED",
        });

        // Notificar a recepción que la orden está lista
        const allPreparations = await preparationRepository.findBy({
          orderId: job.data.orderId,
        });

        const allPreparationsDone = allPreparations.every(
          (prep) => prep.status === "COMPLETED"
        );

        if (allPreparationsDone) {
          await RabbitMQProducer.emitEvent("reception", {
            pattern: "order_updated",
            data: { orderId: job.data.orderId, status: "COMPLETED" },
          });

          console.log(
            `Preparaciones completadas para la orden ${job.data.orderId}`
          );
        }

        return {
          success: true,
          message: `Preparación ${job.data.id} (${job.data.mealName}) lista`,
        };
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

const requestIngredients = async (
  preparation: Preparation & {
    ingredients: { ingredientName: string; qty: number }[];
  }
) => {
  console.log("Inicio de requestIngredients...");
  const result = await RabbitMQProducer.sendRPCRequest("storage", {
    pattern: "request_ingredients",
    data: preparation,
  });

  if (!result.success) {
    throw new Error(result?.error || "Server Error");
  }
  console.log(`Fin de requestIngredients (${preparation.id})...`);
  return result.data;
};

export default worker;
