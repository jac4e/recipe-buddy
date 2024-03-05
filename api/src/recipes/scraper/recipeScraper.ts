import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { Recipe } from '../schemas/recipe.schema';

@Injectable()
export class RecipeScraper {
  parseRecipeSteps(steps) {
    return steps.flat().map((step) => {
      if (typeof step === 'string') return step.trim();
      if (step.hasOwnProperty('text')) return step.text.trim();
      throw new Error('Unable to parse recipe steps');
    });
  }

  parseImageUrl(image) {
    if (Array.isArray(image)) image = image[0];
    if (typeof image === 'string') return image;
    if (image.hasOwnProperty('url')) return image.url;
    return undefined;
  }

  parseRecipeIngredients = (ingredients) => {
    return ingredients.flat().map((ingredient) => ingredient.trim());
  };

  parseRecipeTime = (time) => {
    if (typeof time === 'string') {
      const regex = /P(?:\d+D)?T(\d+H)?(\d+M)/;
      const match = time.match(regex);
      const hours = match[1] ? Number(match[1].slice(0, -1)) : 0;
      const minutes = match[2] ? Number(match[2].slice(0, -1)) : 0;
      if (hours || minutes) return `${hours ? hours + ' hours' : ''}${minutes ? ' ' + minutes + ' minutes' : ''}`.trim();
    }
    return undefined;
  }

  parseRecipeYeild = (recipeYield) => {
    if (Array.isArray(recipeYield) && recipeYield.length > 0 && typeof recipeYield[0] === 'string') {
      const yieldString = recipeYield[0];

      const regex = /(\d+)(?:\s(.*))?/;
      const match = yieldString.match(regex);

      if (match) {
        if (match[1]) return match[1].trim();
      }
    }
    if (typeof recipeYield === 'number') return recipeYield.toString().trim();
    if (typeof recipeYield === 'string') return recipeYield;

    return undefined;
  }


  parseRecipeYeildSize = (recipeYield) => {
    if (Array.isArray(recipeYield) && recipeYield.length > 1 && typeof recipeYield[0] === 'string') {
      const yieldString = recipeYield[1];

      const regex = /(\d+)(?:\s(.*))?/;
      const match = yieldString.match(regex);

      if (match) {
        if (match[2]) return match[2].trim();
      }
    }

    return undefined;
  }

  parseRecipeNutrition = (nutrition) => {
    if (typeof nutrition === 'object') {
      if (nutrition.hasOwnProperty('@type')) delete nutrition['@type'];
      if (nutrition.hasOwnProperty('servingSize')) delete nutrition['servingSize'];
      // Join all the values together and remove any leading or trailing whitespace, adding the key after the value if the value is ony a number and unit
      let nutritionString = '';
      for (const key in nutrition) {
        if (nutrition.hasOwnProperty(key)) {
          if (nutrition[key] === null || nutrition[key] === undefined || nutrition[key] === '') continue;
          if (nutrition[key].split(' ').length <= 2 && nutrition[key].split(' ')[1] !== 'calories') {
            let keyString = key.replace('Content', '');
            
            // Convert camelCase to standard case
            keyString = keyString.replace(/([A-Z])/g, ' $1').trim();
            // Replace carbohydrate with carbohydrates
            if (keyString === 'carbohydrate') keyString = 'carbhohydrates';

            nutritionString += `${nutrition[key]} ${keyString}, `
          } else {
            nutritionString += `${nutrition[key]}, `
          }
        }
      }
      return nutritionString.trim().slice(0, -1);
    }
    return undefined;
  }

  parseRecipeName = (name) => {
    return name.trim();
  };

  async getNodeListOfMetadataNodesFromUrl(url: string) {
    const dom = await JSDOM.fromURL(url);
    const nodeList: NodeList = dom.window.document.querySelectorAll(
      "script[type='application/ld+json']",
    );

    if (nodeList.length === 0)
      throw new Error('The linked page contains no metadata');

    return nodeList;
  }

  getSchemaRecipeFromNodeList(nodeList: NodeList) {
    for (const node of nodeList.values()) {
      let parsedNodeContent;

      try {
        parsedNodeContent = JSON.parse(node.textContent);
      } catch (e) {
        continue;
      }

      if (Array.isArray(parsedNodeContent)) {
        for (const metadataObject of parsedNodeContent) {
          if (this.jsonObjectIsRecipe(metadataObject)) {
            return metadataObject;
          }
        }
      } else {
        if (this.jsonObjectIsRecipe(parsedNodeContent)) {
          return parsedNodeContent;
        }
        if (this.jsonObjectHasGraph(parsedNodeContent)) {
          for (const graphNode of parsedNodeContent['@graph']) {
            if (this.jsonObjectIsRecipe(graphNode)) {
              return graphNode;
            }
          }
        }
      }
    }
    throw new Error('Unable to extract Recipe metadata from provided url');
  }

  jsonObjectIsRecipe(jsonObject: object): boolean {
    return (
      jsonObject.hasOwnProperty('@type') && /recipe/i.test(jsonObject['@type'])
    );
  }

  jsonObjectHasGraph(jsonObject: object): boolean {
    return jsonObject.hasOwnProperty('@graph');
  }

  async hydrateRecipe(url: string) {
    try {
      const nodeList: NodeList = await this.getNodeListOfMetadataNodesFromUrl(
        url,
      );

      const recipeData = this.getSchemaRecipeFromNodeList(nodeList);

      const recipe = new Recipe();

      recipe.name = this.parseRecipeName(recipeData.name);
      recipe.url = url;
      recipe.ingredients = this.parseRecipeIngredients(
        recipeData.recipeIngredient,
      );
      recipe.steps = this.parseRecipeSteps(recipeData.recipeInstructions);
      recipe.imageUrl = this.parseImageUrl(recipeData.image);

      recipe.cookTime = this.parseRecipeTime(recipeData.cookTime);
      recipe.prepTime = this.parseRecipeTime(recipeData.prepTime);
      recipe.totalTime = this.parseRecipeTime(recipeData.totalTime);

      recipe.servings = this.parseRecipeYeild(recipeData.recipeYield);
      recipe.servingsSize = this.parseRecipeYeildSize(recipeData.recipeYield);
      recipe.nutrition = this.parseRecipeNutrition(recipeData.nutrition);


      return recipe;
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException(e.message);
    }
  }
}
