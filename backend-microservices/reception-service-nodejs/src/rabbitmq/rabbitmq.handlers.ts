import { AppService } from "../services/app.service";

export const handleMessage = async (
  pattern: string,
  data: any,
  appService: AppService
) => {
  switch (pattern) {
    case "create_preparation":
      console.log("[RabbitMQ] Crear preparación para orden");
      return await appService.createOrder();

    case "order_updated":
      console.log(`[RabbitMQ] Orden actualizada: ${data.orderId}`);
      return await appService.updateOrder(data);

    case "get_orders":
      console.log("[RabbitMQ] Listado de órdenes solicitado");
      return await appService.getOrders();

    case "reset_orders":
      console.log("[RabbitMQ] Reseteando órdenes");
      return await appService.resetOrders();

    default:
      console.error(`[RabbitMQ] Patrón desconocido: ${pattern}`);
      throw new Error("Patrón desconocido");
  }
};
