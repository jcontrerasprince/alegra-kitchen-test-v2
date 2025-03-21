import { DataSource } from "typeorm";
import "dotenv/config";

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // Solo para desarrollo
  logging: false,
  entities: ["src/entities/*.ts"],
});

export default AppDataSource;
