export class CreateRecipeDto {
  url: string;
  name?: string;
  ingredients?: string[];
  steps?: string[];
  imageUrl?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  servingsSize?: string;
  nutrition?: string;
}
