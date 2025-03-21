import AppDataSource from "../config/ormconfig";
import { MoreThanOrEqual } from "typeorm";
import { getNowMinusMinutes } from "../utils";
import { Ingredient } from "../entities/Ingredient";
import { PurchasedIngredient } from "../entities/PurchasedIngredient";
import { originalIngredients } from "../seeds/ingredients-seed";
import axios from "axios";

export class AppService {
  private ingredientRepository = AppDataSource.getRepository(Ingredient);
  private purchasedIngredientRepository =
    AppDataSource.getRepository(PurchasedIngredient);
  MINUTES_TO_SUBSTRACT = 30;

  async processIngredients(order: {
    orderId: string;
    ingredients: { ingredientName: string; qty: number }[];
  }): Promise<{ ingredientName: string; qty: number }[] | false> {
    console.log("Inicio de processIngredients...");
    let lockOrderFlag = false;
    const orderIngredientsWithStorage =
      await this.checkEveryIngredientInStorage(order.ingredients);

    for (let i = 0; i < orderIngredientsWithStorage.length; i++) {
      const orderIngredient = orderIngredientsWithStorage[i];

      let qtyRlyAvailable = this.getQtyRlyAvailable(
        order.orderId,
        orderIngredient
      );

      let ingredientQtyAvailable = qtyRlyAvailable - orderIngredient.qty;

      const isBuyFromMarket = ingredientQtyAvailable < 0;

      if (isBuyFromMarket) {
        const ingredientQtyFromMarket = await this.buyFromMarket({
          ingredientName: orderIngredient.ingredientName,
          orderId: order.orderId,
        });

        orderIngredient.qtyAvailable += ingredientQtyFromMarket.qtySold;

        qtyRlyAvailable += ingredientQtyFromMarket.qtySold;

        if (qtyRlyAvailable < orderIngredient.qty) {
          lockOrderFlag = true;
        }
      }
    }

    this.calculateQtyAndLock(
      lockOrderFlag,
      orderIngredientsWithStorage,
      order.orderId
    );

    await Promise.allSettled(
      orderIngredientsWithStorage.map((orderIngredient) =>
        this.ingredientRepository.save(orderIngredient)
      )
    );

    if (lockOrderFlag) {
      console.log(
        "Fin de processIngredients de que NO hay un ingrediente al menos..."
      );
      return false;
    }

    orderIngredientsWithStorage.forEach((orderIngredient, i) => {
      orderIngredientsWithStorage[i].qtyAvailable -= orderIngredient.qty;
    });

    console.log("Fin de processIngredients de que SI hay ingredientes...");
    return order.ingredients;
  }

  getStorage() {
    console.log("Método de getStorage...");
    return this.ingredientRepository.find({ order: { id: "ASC" } });
  }

  getPurchasedIngredients() {
    console.log("Método de getPurchaseIngredients...");
    return this.purchasedIngredientRepository.find({
      order: { createdAt: "DESC" },
      where: {
        createdAt: MoreThanOrEqual(
          getNowMinusMinutes(this.MINUTES_TO_SUBSTRACT)
        ),
      },
    });
  }

  async resetIngredients() {
    console.log("Método de resetIngredients...");
    this.ingredientRepository.save(originalIngredients);
  }

  private async checkEveryIngredientInStorage(
    ingredients: { ingredientName: string; qty: number }[]
  ) {
    console.log("Inicio de checkEveryIngredientInStorage...");
    let ingredientsWithStorage: Array<
      Ingredient & { qty: number; qtySold: number }
    > = [];
    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i];
      const storageIngredient = await this.ingredientRepository.findOneBy({
        ingredientName: ingredient.ingredientName,
      });

      if (!storageIngredient) {
        throw new Error("New No Ingredient");
      }

      ingredientsWithStorage.push({
        ...storageIngredient,
        qty: ingredient.qty,
        qtySold: 0,
      });
    }

    console.log("Fin de checkEveryIngredientInStorage...");
    return ingredientsWithStorage;
  }

  private calculateQtyAndLock(
    lockOrderFlag: boolean,
    ingredients: Array<
      Ingredient & {
        qty: number;
        qtySold: number;
      }
    >,
    orderId: string
  ) {
    console.log("Inicio de calculateQtyAndLock...");
    if (lockOrderFlag) {
      ingredients.forEach((ingredient, i) => {
        if (Array.isArray(ingredient.orders)) {
          if (!ingredient.orders.includes(orderId)) {
            ingredients[i].orders.push(orderId);
            ingredients[i].qtyLock += ingredient.qty;
          }
        } else {
          ingredients[i].orders = [orderId];
          ingredients[i].qtyLock += ingredient.qty;
        }
      });
    } else {
      ingredients.forEach((ingredient, i) => {
        ingredients[i].qtyAvailable -= ingredient.qty;

        const orderIndex = ingredient.orders.indexOf(orderId);
        if (orderIndex > -1) {
          ingredients[i].orders.splice(orderIndex, 1);
          ingredients[i].qtyLock -= ingredient.qty;
          ingredients[i].qtyLock < 0 ? 0 : ingredients[i].qtyLock;
        }
      });
    }
    console.log("Fin de calculateQtyAndLock...");
  }

  private getQtyRlyAvailable(
    orderId: string,
    ingredient: Ingredient & {
      qty: number;
      qtySold: number;
    }
  ) {
    console.log("Inicio de getQtyRlyAvailable...");
    const orderExist = ingredient.orders.includes(orderId);
    if (orderExist) {
      return ingredient.qtyAvailable - (ingredient.qtyLock - ingredient.qty);
    }

    console.log("Fin de getQtyRlyAvailable...");
    return ingredient.qtyAvailable - ingredient.qtyLock;
  }

  private async buyFromMarket(ingredient: {
    ingredientName: string;
    orderId: string;
  }) {
    console.log("Fin de buyFromMarket...");
    const URL_FARMERS_MARKET = process.env.URL_FARMERS_MARKET || "";

    const marketResponse = await axios.get<{ quantitySold: number }>(
      URL_FARMERS_MARKET,
      {
        params: { ingredient: ingredient.ingredientName },
      }
    );

    const qtySold = marketResponse.data.quantitySold;

    await this.purchasedIngredientRepository.insert({
      ingredientName: ingredient.ingredientName,
      qtyPurchased: qtySold,
      order: ingredient.orderId,
    });

    console.log(
      `Fin de buyFromMarket (${ingredient.ingredientName}: ${qtySold})...`
    );
    return {
      ingredientName: ingredient.ingredientName,
      qtySold,
    };
  }
}
