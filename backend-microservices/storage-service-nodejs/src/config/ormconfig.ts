import { DataSource } from "typeorm";
import "dotenv/config";
import { Ingredient } from "./../entities/Ingredient";
import { PurchasedIngredient } from "./../entities/PurchasedIngredient";

const isProd = process.env.NODE_ENV === "production";

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // Solo para desarrollo
  logging: false,
  entities: [Ingredient, PurchasedIngredient],
});

export default AppDataSource;
