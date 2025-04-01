import { Router, Request, Response } from "express";
import { AppService } from "../services/app.service";

export default function createAppRouter(appService: AppService) {
  const router = Router();

  router.get("/", (req: Request, res: Response) => {
    res.json(appService.getHello());
  });

  router.get("/orders", async (req: Request, res: Response) => {
    try {
      const orders = await appService.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/storage", async (req: Request, res: Response) => {
    try {
      const storage = await appService.getStorage();
      res.json(storage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/create_order", async (req: Request, res: Response) => {
    try {
      const meal = await appService.createOrder();
      res.json(meal);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/preparations", async (req: Request, res: Response) => {
    try {
      const preparations = await appService.getPreparations();
      res.json(preparations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/shopping_history", async (req: Request, res: Response) => {
    try {
      const history = await appService.getPurchasedIngredients();
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/meals", async (req: Request, res: Response) => {
    try {
      const meals = await appService.getMeals();
      res.json(meals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/reset_ingredients", async (req: Request, res: Response) => {
    try {
      await appService.resetIngredients();
      res.json({ message: "Ingredients reset successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post(
    "/reset_orders_and_preparations",
    async (req: Request, res: Response) => {
      try {
        await appService.resetOrdersAndPreparations();
        res.json({ message: "Orders and preparations reset successfully" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // HEALTH CHECKS

  router.get(
    "/health-check-reception",
    async (_req: Request, res: Response) => {
      try {
        const result = await appService.getHealthCheckReception();
        res.json({ mensaje: result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  router.get("/health-check-kitchen", async (_req: Request, res: Response) => {
    try {
      const result = await appService.getHealthCheckKitchen();
      res.json({ mensaje: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/health-check-storage", async (_req: Request, res: Response) => {
    try {
      const result = await appService.getHealthCheckStorage();
      res.json({ mensaje: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
