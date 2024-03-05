import { Test, TestingModule } from '@nestjs/testing';
import { RecipesService } from './recipes.service';
import { Recipe, RecipeDocument } from './schemas/recipe.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RecipeScraper } from './scraper/recipeScraper';

// const mockRecipe = (
//   url = 'https://www.bbcgoodfood.com/recipes/bellini',
//   name = 'Bellini',
//   imageUrl = 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/bellini-b049342.jpg?quality=90&webp=true&resize=300,272',
//   ingredients = ['500ml peach purée or peach nectar', '1 bottle prosecco'],
//   steps = [
//     'Put the peach puree in a Champagne flute up to about 1/3 full and slowly top up with Prosecco.',
//   ],
// ): Recipe => ({
//   url,
//   name,
//   imageUrl,
//   ingredients,
//   steps,
// });

export const mockRecipe = (
  url,
  name,
  imageUrl,
  ingredients,
  steps,
  prepTime,
  cookTime,
  totalTime,
  servings,
  servingsSize,
  nutrition,
): Recipe => ({
  url,
  name,
  imageUrl,
  ingredients,
  steps,
  prepTime,
  cookTime,
  totalTime,
  servings,
  servingsSize,
  nutrition,
});

const mockRecipeDoc = (mock?: Partial<Recipe>): Partial<RecipeDocument> => ({
  url: mock?.url || 'https://www.bbcgoodfood.com/recipes/bellini',
  name: mock?.name || 'Bellini',
  imageUrl:
    mock?.imageUrl ||
    'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/bellini-b049342.jpg?quality=90&webp=true&resize=300,272',
  ingredients: mock?.ingredients || [
    '500ml peach purée or peach nectar',
    '1 bottle prosecco',
  ],
  steps: mock?.steps || [
    'Put the peach puree in a Champagne flute up to about 1/3 full and slowly top up with Prosecco.',
  ],
  prepTime: mock?.prepTime || '5 minutes',
  cookTime: mock?.cookTime || undefined,
  totalTime: mock?.totalTime || '5 minutes',
  servings: mock?.servings || '6',
  servingsSize: mock?.servingsSize || undefined,
  nutrition:
    mock?.nutrition ||
    '143 calories, 18 grams carbohydrates, 18 grams sugar, 0.7 grams fiber, 0.7 grams protein',
});

const belliniRecipe =  mockRecipe(
  'https://www.bbcgoodfood.com/recipes/bellini',
  'Bellini',
  'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/bellini-b049342.jpg?quality=90&webp=true&resize=300,272',
  ['500ml peach purée or peach nectar', '1 bottle prosecco'],
  [
    'Put the peach puree in a Champagne flute up to about 1/3 full and slowly top up with Prosecco.',
  ],
  '5 minutes',
  undefined,
  '5 minutes',
  '6',
  undefined,
  '143 calories, 18 grams carbohydrates, 18 grams sugar, 0.7 grams fiber, 0.7 grams protein'
);

const recipeArray = [belliniRecipe];

const recipeDocArray = [mockRecipeDoc()];

describe('RecipesService', () => {
  let service: RecipesService;
  let model: Model<RecipeDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        RecipeScraper,
        {
          provide: getModelToken('Recipe'),
          useValue: {
            new: jest.fn().mockResolvedValue(belliniRecipe),
            constructor: jest.fn().mockResolvedValue(belliniRecipe),
            find: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
    model = module.get<Model<RecipeDocument>>(getModelToken('Recipe'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all recipes', async () => {
    jest.spyOn(model, 'find').mockReturnValue({
      exec: jest.fn().mockResolvedValueOnce(recipeDocArray),
    } as any);
    const recipes = await service.findAll();
    expect(recipes).toEqual(recipeArray);
  });
});
