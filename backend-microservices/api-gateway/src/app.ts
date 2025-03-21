import express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";

import appController from "./controllers/app.controller";
import { AppService } from "./services/app.service";
import { RabbitMQConsumer } from "./rabbitmq/consumers/rabbitmq.consumer";
import { RabbitMQConfig } from "./config/rabbitmq.config";

const app = express();

const port = process.env.PORT || 3000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});
const appService = new AppService(io);

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Rutas
app.use("/", appController(appService));

RabbitMQConfig.getChannel()
  .then(() => {
    RabbitMQConsumer.consume("api-gateway", appService);
  })
  .catch((err) => {
    console.error("No se pudo conectar a RabbitMQ:", err.message);
  });

httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
