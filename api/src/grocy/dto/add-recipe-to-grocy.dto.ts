interface Ingredient {
  grocyProductId: string;
  quantity: string;
  useAnyUnit: boolean;
  quantityUnitId: string;
}

export class AddRecipeToGrocyDto {
  _id: string;
  name: string;
  steps: string[];
  ingredients: Ingredient[];
  originalIngredients: string[];
  imageUrl: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  servings: string;
  servingsSize: string;
  nutrition: string;
  url: string;
}
