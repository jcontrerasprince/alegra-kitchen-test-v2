import cron from "node-cron";
import { AppService } from "../services/app.service";
import "dotenv/config";

const appService = new AppService();

const ORDER_RETRY_CRON = process.env.ORDER_RETRY_CRON || "*/10 * * * *";

// Ejecutar cada 10 minutos
cron.schedule(ORDER_RETRY_CRON, async () => {
  console.log("Reintentando órdenes pendientes...");
  await appService.retryPendingOrders();
});

export default cron;
