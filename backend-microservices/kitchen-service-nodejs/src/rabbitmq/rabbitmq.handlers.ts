import { AppService } from "../services/app.service";

export const handleMessage = async (
  pattern: string,
  data: any,
  appService: AppService
) => {
  switch (pattern) {
    case "order_created":
      console.log(`[RabbitMQ] Orden creada: ${data.orderId}`);
      return await appService.createPreparation(data);

    case "get_preparations":
      console.log("[RabbitMQ] Listado de preparaciones solicitado");
      return await appService.getPreparations();

    case "retry_pending_orders":
      console.log("[RabbitMQ] Reintentando órdenes pendientes");
      return await appService.retryPendingOrders(data);

    case "reset_preparations":
      console.log("[RabbitMQ] Reseteando preparaciones");
      return await appService.resetPreparations();

    case "get_meals":
      console.log("[RabbitMQ] Listado de comidas solicitado");
      return await appService.getMeals();

    default:
      console.error(`[RabbitMQ] Patrón desconocido: ${pattern}`);
      throw new Error("Patrón desconocido");
  }
};
