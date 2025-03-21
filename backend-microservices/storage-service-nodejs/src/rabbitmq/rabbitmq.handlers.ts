import { AppService } from "../services/app.service";

export const handleMessage = async (
  pattern: string,
  data: any,
  appService: AppService
) => {
  switch (pattern) {
    case "request_ingredients":
      console.log("[RabbitMQ] Procesando mensaje 'request_ingredients'");
      return await appService.processIngredients(data);

    case "get_storage":
      console.log("[RabbitMQ] Procesando mensaje 'get_storage'");
      return await appService.getStorage();

    case "get_purchased_ingredients":
      console.log("[RabbitMQ] Procesando mensaje 'get_purchased_ingredients'");
      return await appService.getPurchasedIngredients();

    case "reset_ingredients":
      console.log("[RabbitMQ] Procesando mensaje 'reset_ingredients'");
      return await appService.resetIngredients();

    default:
      console.error(`[RabbitMQ] Patrón desconocido: ${pattern}`);
      throw new Error("Patrón desconocido");
  }
};
