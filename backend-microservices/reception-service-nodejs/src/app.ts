import express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";
import AppDataSource from "./config/ormconfig";

import { AppService } from "./services/app.service";
import { RabbitMQConsumer } from "./rabbitmq/consumers/rabbitmq.consumer";
import "./cron/cron-jobs"; // Inicio de los cron jobs
import { RabbitMQConfig } from "./config/rabbitmq.config";

const app = express();

const port = process.env.PORT || 3000;

const appService = new AppService();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

RabbitMQConfig.getChannel()
  .then(() => {
    RabbitMQConsumer.consume("reception", appService);
  })
  .catch((err) => {
    console.error("No se pudo conectar a RabbitMQ:", err.message);
  });

AppDataSource.initialize()
  .then(() => {
    console.log("Base de datos conectada");

    // Iniciar servidor después de conectar DB
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => console.error("Error conectando a la BD:", err));
