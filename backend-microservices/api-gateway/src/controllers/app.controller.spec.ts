import request from "supertest";
import express from "express";
import appController from "./app.controller";
import { AppService } from "../services/app.service";
import { Server } from "socket.io";

jest.mock("../services/app.service");

const orderMocked = {
  id: 1,
  orderId: "order_1",
  status: "PENDING",
  createAt: "2025-04-01 23:32:12.368728+00",
  updateAt: "2025-04-01 23:32:12.368728+00",
  meals: [
    {
      qty: 1,
      mealName: "Papas Fritas con Queso",
    },
    {
      qty: 1,
      mealName: "Estofado de Carne",
    },
  ],
};

const mealMocked = {
  mealName: "Ensalada Fresca",
  ingredients: [
    { ingredientName: "lettuce", qty: 1 },
    { ingredientName: "tomato", qty: 2 },
    { ingredientName: "onion", qty: 1 },
    { ingredientName: "lemon", qty: 1 },
  ],
};

const preparationMocked = {
  id: 1,
  orderId: "order_1",
  mealName: "Papas Fritas con Queso",
  createAt: "2025-04-01 23:32:12.368728+00",
  updateAt: "2025-04-01 23:32:12.368728+00",
  status: "COMPLETED",
};

const ingredientMocked = {
  id: 1,
  qtyAvailable: 5,
  qtyLock: 0,
  ingredientName: "tomato",
  preparationIds: [],
};

const purchasedIngredientMocked = {
  id: 1,
  ingredientName: "potato",
  qtyPurchased: 5,
  createAt: "2025-04-01 23:32:12.368728+00",
  preparationId: 204,
};

const serviceStatusMocked = {
  status: "ok",
  database: "connected",
  rabbitMQ: "connected",
  timestamp: "2025-04-01 23:32:12.368728+00",
};

describe("API Gateway Controller", () => {
  let appService: jest.Mocked<AppService>;
  let app: express.Express;

  beforeEach(() => {
    appService = new AppService({} as Server) as jest.Mocked<AppService>;
    appService.getHello.mockReturnValue({ message: "Hello World!" });
    appService.getOrders.mockResolvedValue([orderMocked]);
    appService.createOrder.mockResolvedValue(orderMocked);
    appService.getMeals.mockResolvedValue([mealMocked]);
    appService.getStorage.mockResolvedValue([ingredientMocked]);
    appService.getPreparations.mockResolvedValue([preparationMocked]);
    appService.getPurchasedIngredients.mockResolvedValue([
      purchasedIngredientMocked,
    ]);
    appService.resetIngredients.mockResolvedValue();
    appService.resetOrdersAndPreparations.mockResolvedValue();
    appService.getHealthCheckReception.mockResolvedValue(serviceStatusMocked);
    appService.getHealthCheckKitchen.mockResolvedValue(serviceStatusMocked);
    appService.getHealthCheckStorage.mockResolvedValue(serviceStatusMocked);

    app = express();
    app.use(express.json());
    app.use("/", appController(appService));
  });

  it("GET / debería responder con 'Hello World!'", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Hello World!" });
  });

  it("GET /orders debería devolver una lista de órdenes", async () => {
    const response = await request(app).get("/orders");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([orderMocked]);
  });

  it("POST /create_order debería crear una orden", async () => {
    const response = await request(app).post("/create_order");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(orderMocked);
  });

  it("GET /meals debería devolver una lista de comidas", async () => {
    const response = await request(app).get("/meals");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([mealMocked]);
  });

  it("GET /storage debería devolver el inventario", async () => {
    const response = await request(app).get("/storage");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([ingredientMocked]);
  });

  it("GET /preparations debería devolver las preparaciones", async () => {
    const response = await request(app).get("/preparations");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([preparationMocked]);
  });

  it("GET /shopping_history debería devolver el historial de compras", async () => {
    const response = await request(app).get("/shopping_history");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([purchasedIngredientMocked]);
  });

  it("POST /reset_ingredients debería resetear los ingredientes", async () => {
    const response = await request(app).post("/reset_ingredients");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Ingredients reset successfully",
    });
  });

  it("POST /reset_orders_and_preparations debería resetear órdenes y preparaciones", async () => {
    const response = await request(app).post("/reset_orders_and_preparations");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Orders and preparations reset successfully",
    });
  });

  it("GET /health-check-reception debería devolver 'OK'", async () => {
    const response = await request(app).get("/health-check-reception");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(serviceStatusMocked);
  });

  it("GET /health-check-kitchen debería devolver 'OK'", async () => {
    const response = await request(app).get("/health-check-kitchen");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(serviceStatusMocked);
  });

  it("GET /health-check-storage debería devolver 'OK'", async () => {
    const response = await request(app).get("/health-check-storage");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(serviceStatusMocked);
  });

  it("debería manejar errores en la API", async () => {
    appService.getOrders.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/orders");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Database error" });
  });
});
