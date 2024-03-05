import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AddRecipeToGrocyDto } from './dto/add-recipe-to-grocy.dto';
import axios from 'axios';
import { uid } from 'rand-token';
import { UsersService } from '../users/users.service';
import { RecipesService } from '../recipes/recipes.service';
import { Recipe } from '../recipes/schemas/recipe.schema';

const newRecipeSlug = '/api/objects/recipes';
const newIngredientSlug = '/api/objects/recipes_pos';
const newImageSlug = (uid) => `/api/files/recipepictures/${uid}`;

interface RequestWithUserInfo extends Request {
  user: {
    userId: string;
  };
}

@Injectable()
export class GrocyService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly usersService: UsersService,
    private readonly recipesService: RecipesService,
  ) {}

  grocyBase = '';
  grocyKey = '';

  parseSteps = (steps: string[]) =>
    `<ol>${steps.map((step) => `<li>${step}</li>`).join(' ')}</ol>`;

  // async createRecipeInGrocy(name: string, steps: string[]) {
  async createRecipeInGrocy(recipe: AddRecipeToGrocyDto) {
    this.logger.log(recipe.name);
    const parsedSteps = this.parseSteps(recipe.steps);

    // Build description
    let description = ``;
    if (recipe.prepTime) {
      description += `<h4>Prep Time:</h4><p>${recipe.prepTime}</p>`;
    }
    if (recipe.cookTime) {
      description += `<h4>Cook Time:</h4><p>${recipe.cookTime}</p>`;
    }
    if (recipe.totalTime) {
      description += `<h4>Total Time:</h4><p>${recipe.totalTime}</p>`;
    }
    if (recipe.servings) {
      description += `<h4>Servings:</h4><p>${recipe.servings} (${recipe.servingsSize})</p>`;
    }
    description += `<h3>Steps:</h3><p>${parsedSteps}</p>`;
    if (recipe.nutrition){
      description += `<h4>Nutrition:</h4><p>${recipe.nutrition}</p>`;
    }
    description += `<h4>Scraped From:</h4><p>${recipe.url}</p>`;
    description += `<h4>Full Ingredients:</h4><p>${recipe.originalIngredients}</p>`;


    try {
      const { data } = await axios.post(
        `${this.grocyBase}${newRecipeSlug}`,
        {
          name: recipe.name,
          description: description,
        },
        {
          headers: {
            'GROCY-API-KEY': this.grocyKey,
          },
        },
      );
      this.logger.log(data);
      return data;
    } catch (e) {
      throw e;
    }
  }

  async associateIngredientsWithRecipe(recipeId: string, ingredients: any[]) {
    try {
      for (const ingredient of ingredients) {
        axios.post(
          `${this.grocyBase}${newIngredientSlug}`,
          {
            recipe_id: recipeId,
            product_id: ingredient.grocyProductId,
            amount: ingredient.quantity,
            qu_id: ingredient.quantityUnitId,
            only_check_single_unit_in_stock: ingredient.useAnyUnit ? '1' : '0',
          },
          {
            headers: {
              'GROCY-API-KEY': this.grocyKey,
            },
          },
        );
      }
    } catch (e) {
      throw e;
    }
  }

  async uploadPictureToGrocyAndAssociateWithRecipe(
    pictureUrl: string,
    recipeId: string,
  ) {
    try {
      const { data } = await axios.get(pictureUrl, {
        responseType: 'stream',
      });

      const extension = pictureUrl.match(/\.([0-z]+)$/g)[0];
      const filename = uid(25) + extension;
      const base64Filename = Buffer.from(filename).toString('base64');

      await axios.put(
        `${this.grocyBase}${newImageSlug(base64Filename)}`,
        data,
        {
          headers: {
            'GROCY-API-KEY': this.grocyKey,
          },
        },
      );

      await axios.put(
        `${this.grocyBase}${newRecipeSlug}/${recipeId}`,
        {
          picture_file_name: filename,
        },
        {
          headers: {
            'GROCY-API-KEY': this.grocyKey,
          },
        },
      );
    } catch (e) {
      throw e;
    }
  }

  async addRecipeToGrocy(
    addRecipeToGrocyDto: AddRecipeToGrocyDto,
    req: RequestWithUserInfo,
  ): Promise<any> {
    this.logger.log(addRecipeToGrocyDto);
    try {
      const userInfo = await this.usersService.findOneById(req.user.userId);
      this.grocyBase = userInfo.grocyBaseUrl;
      this.grocyKey = userInfo.grocyApiKey;
      const data = await this.createRecipeInGrocy(
        addRecipeToGrocyDto
      );
      const { created_object_id } = data;
      await this.associateIngredientsWithRecipe(
        created_object_id,
        addRecipeToGrocyDto.ingredients,
      );
      if (addRecipeToGrocyDto.imageUrl)
        await this.uploadPictureToGrocyAndAssociateWithRecipe(
          addRecipeToGrocyDto.imageUrl,
          created_object_id,
        );
      // if (addRecipeToGrocyDto.servings) {
      //   await this.recipesService.updateServings(
      //     addRecipeToGrocyDto._id,
      //     addRecipeToGrocyDto.servings,
      //     addRecipeToGrocyDto.servingsSize,
      //   );
      // }
    } catch (e) {
      this.logger.error(e.message);
      throw new HttpException(e.message, 500);
    }
    await this.recipesService.remove(addRecipeToGrocyDto._id);
    return Promise.resolve({ message: 'Recipe created successfully' });
  }
}
