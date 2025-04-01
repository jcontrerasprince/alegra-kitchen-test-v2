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

  async processIngredients(preparation: {
    id: string;
    orderId: string;
    ingredients: { ingredientName: string; qty: number }[];
  }): Promise<{ ingredientName: string; qty: number }[] | false> {
    console.log("Inicio de processIngredients...");
    let lockPreparationFlag = false;

    const preparationIngredientsWithStorage =
      await this.addEveryIngredientInStorage(preparation.ingredients);

    for (let i = 0; i < preparationIngredientsWithStorage.length; i++) {
      const preparationIngredient = preparationIngredientsWithStorage[i];

      // Esto resto de los locks lo que se está pidiendo ahora porque se tenía apartado
      let qtyRlyAvailable = this.getQtyRlyAvailable(
        preparation.id,
        preparationIngredient
      );

      let ingredientQtyAvailable = qtyRlyAvailable - preparationIngredient.qty;

      const isBuyFromMarket = ingredientQtyAvailable < 0;

      if (isBuyFromMarket) {
        const ingredientQtyFromMarket = await this.buyFromMarket({
          ingredientName: preparationIngredient.ingredientName,
          preparationId: preparation.id,
        });

        preparationIngredient.qtyAvailable += ingredientQtyFromMarket.qtySold;

        qtyRlyAvailable += ingredientQtyFromMarket.qtySold;

        if (qtyRlyAvailable < preparationIngredient.qty) {
          lockPreparationFlag = true;
        }
      }
    }

    this.calculateQtyAndLock(
      lockPreparationFlag,
      preparationIngredientsWithStorage,
      preparation.id
    );

    await Promise.allSettled(
      preparationIngredientsWithStorage.map((preparationIngredient) =>
        this.ingredientRepository.save(preparationIngredient)
      )
    );

    if (lockPreparationFlag) {
      console.log(
        "Fin de processIngredients de que NO hay al menos un ingrediente..."
      );
      return false;
    }

    preparationIngredientsWithStorage.forEach((preparationIngredient, i) => {
      preparationIngredientsWithStorage[i].qtyAvailable -=
        preparationIngredient.qty;
    });

    console.log("Fin de processIngredients de que SI hay ingredientes...");
    return preparation.ingredients;
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
      take: 10,
    });
  }

  async resetIngredients() {
    console.log("Método de resetIngredients...");
    this.ingredientRepository.save(originalIngredients);
  }

  private async addEveryIngredientInStorage(
    ingredients: { ingredientName: string; qty: number }[]
  ) {
    console.log("Inicio de addEveryIngredientInStorage...");
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

    console.log("Fin de addEveryIngredientInStorage...");
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
    preparationId: string
  ) {
    console.log("Inicio de calculateQtyAndLock...");
    if (lockOrderFlag) {
      ingredients.forEach((ingredient, i) => {
        if (Array.isArray(ingredient.preparationIds)) {
          if (!ingredient.preparationIds.includes(preparationId)) {
            ingredients[i].preparationIds.push(preparationId);
            ingredients[i].qtyLock += ingredient.qty;
          }
        } else {
          ingredients[i].preparationIds = [preparationId];
          ingredients[i].qtyLock += ingredient.qty;
        }
      });
    } else {
      ingredients.forEach((ingredient, i) => {
        ingredients[i].qtyAvailable -= ingredient.qty;

        const orderIndex = ingredient.preparationIds.indexOf(preparationId);
        if (orderIndex > -1) {
          ingredients[i].preparationIds.splice(orderIndex, 1);
          ingredients[i].qtyLock -= ingredient.qty;
          ingredients[i].qtyLock < 0 ? 0 : ingredients[i].qtyLock;
        }
      });
    }
    console.log("Fin de calculateQtyAndLock...");
  }

  private getQtyRlyAvailable(
    preparationId: string,
    ingredient: Ingredient & {
      qty: number;
      qtySold: number;
    }
  ) {
    console.log("Inicio de getQtyRlyAvailable...");
    const preparationExist = ingredient.preparationIds.includes(preparationId);
    if (preparationExist) {
      return ingredient.qtyAvailable - (ingredient.qtyLock - ingredient.qty);
    }

    console.log("Fin de getQtyRlyAvailable...");
    return ingredient.qtyAvailable - ingredient.qtyLock;
  }

  private async buyFromMarket(ingredient: {
    ingredientName: string;
    preparationId: string;
  }) {
    console.log("Inicio de buyFromMarket...");
    const URL_FARMERS_MARKET = process.env.URL_FARMERS_MARKET || "";

    const marketResponse = await axios.get<{ quantitySold: number }>(
      URL_FARMERS_MARKET,
      {
        params: { ingredient: ingredient.ingredientName },
      }
    );

    const qtySold = marketResponse.data.quantitySold;
    // const qtySold = 0;

    await this.purchasedIngredientRepository.insert({
      ingredientName: ingredient.ingredientName,
      qtyPurchased: qtySold,
      preparationId: ingredient.preparationId,
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
