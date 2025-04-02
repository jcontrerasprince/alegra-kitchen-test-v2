import { DataSource } from "typeorm";
import "dotenv/config";
import { Preparation } from "./../entities/Preparation";

const isProd = process.env.NODE_ENV === "production";

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // Solo para desarrollo
  logging: false,
  entities: [Preparation],
});

export default AppDataSource;
