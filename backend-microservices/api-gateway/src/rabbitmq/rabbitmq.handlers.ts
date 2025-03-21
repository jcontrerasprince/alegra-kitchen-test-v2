import { AppService } from "../services/app.service";

export const handleMessage = async (
  pattern: string,
  data: any,
  appService: AppService
) => {
  switch (pattern) {
    case "order_updated":
      console.log(`[RabbitMQ] Orden actualizada: ${data}`);
      return await appService.orderUpdated(data);

    case "reset_orders":
      console.log("[RabbitMQ] Reseteando órdenes y preparaciones");
      return await appService.resetOrdersAndPreparations();

    case "reset_ingredients":
      console.log("[RabbitMQ] Reseteando ingredientes");
      return await appService.resetIngredients();

    default:
      console.error(`[RabbitMQ] Patrón desconocido: ${pattern}`);
      throw new Error("Patrón desconocido");
  }
};
