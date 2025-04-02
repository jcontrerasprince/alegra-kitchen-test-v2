import { DataSource } from "typeorm";
import "dotenv/config";
import { Order } from "./../entities/Order";

const isProd = process.env.NODE_ENV === "production";

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // Solo para desarrollo
  logging: false,
  entities: [Order],
});

export default AppDataSource;
