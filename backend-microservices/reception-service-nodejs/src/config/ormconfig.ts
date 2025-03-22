import { DataSource } from "typeorm";
import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // Solo para desarrollo
  logging: false,
  entities: [isProd ? "dist/entities/*.js" : "src/entities/*.ts"],
});

export default AppDataSource;
