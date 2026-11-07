import { normalizeIngredientName } from '../pantry/normalize-name.ts';
import { scaleQuantity } from '../recipes/portion-scaling.ts';
import type { MealPlanRepository } from '../../database/repositories/MealPlanRepository';
import type { RecipeRepository } from '../../database/repositories/RecipeRepository';
import type { ShoppingListRepository } from '../../database/repositories/ShoppingListRepository';
import type { ScaledRecipeIngredient, ShoppingListItemInput } from '../../types/meal-planner';
import { addDays, getWeekStartDate } from './calendar.ts';

type UnitDefinition = { key: string; display: string; multiplier: number };
type AggregationGroup = ShoppingListItemInput & { total: number };

export function aggregateShoppingIngredients(ingredients: ScaledRecipeIngredient[]): ShoppingListItemInput[] {
  const groups = new Map<string, AggregationGroup>();
  for (const ingredient of ingredients) {
    const normalizedName = normalizeIngredientName(ingredient.name);
    if (!normalizedName) continue;
    const unit = normalizeUnit(ingredient.unit);
    const hasQuantity = ingredient.quantity !== null;
    const key = `${normalizedName}\u0000${unit.key}\u0000${hasQuantity ? '1' : '0'}`;
    const convertedQuantity = ingredient.quantity === null ? null : ingredient.quantity * unit.multiplier;
    const existing = groups.get(key);
    if (existing) {
      if (convertedQuantity !== null) existing.total += convertedQuantity;
    } else {
      groups.set(key, {
        name: ingredient.name.trim(),
        normalizedName,
        quantity: hasQuantity ? 0 : null,
        unit: unit.display,
        normalizedUnit: unit.key,
        hasQuantity,
        total: convertedQuantity ?? 0,
      });
    }
  }

  return [...groups.values()].map(({ total, ...item }) => ({
    ...item,
    quantity: item.hasQuantity ? roundQuantity(total) : null,
  }));
}

export async function generateShoppingListForWeek(
  weekStartDate: string,
  mealRepository: MealPlanRepository,
  recipeRepository: RecipeRepository,
  shoppingListRepository: ShoppingListRepository,
): Promise<ShoppingListItemInput[]> {
  if (getWeekStartDate(weekStartDate) !== weekStartDate) throw new RangeError('The shopping list week must start on Monday.');
  const entries = await mealRepository.listBetween(weekStartDate, addDays(weekStartDate, 6));
  const recipeIds = [...new Set(entries.flatMap((entry) => entry.entryKind === 'recipe' && entry.recipeId ? [entry.recipeId] : []))];
  const recipes = await Promise.all(recipeIds.map((id) => recipeRepository.getById(id)));
  const recipesById = new Map(recipeIds.map((id, index) => [id, recipes[index]]));
  const ingredients: ScaledRecipeIngredient[] = [];

  for (const entry of entries) {
    if (entry.entryKind !== 'recipe' || !entry.recipeId) continue;
    const recipe = recipesById.get(entry.recipeId);
    if (!recipe) continue;
    for (const ingredient of recipe.ingredients) {
      ingredients.push({
        name: ingredient.name,
        quantity: scaleQuantity(ingredient.quantity, recipe.baseServings, entry.servings),
        unit: ingredient.unit,
      });
    }
  }

  const aggregated = aggregateShoppingIngredients(ingredients);
  await shoppingListRepository.rebuildForWeek(weekStartDate, aggregated);
  return aggregated;
}

function normalizeUnit(value: string | null): UnitDefinition {
  const unit = value?.trim() ?? '';
  const normalized = normalizeIngredientName(unit);
  if (!normalized) return { key: '', display: '', multiplier: 1 };
  if (['g', 'gr', 'gramo', 'gramos'].includes(normalized)) return { key: 'g', display: 'g', multiplier: 1 };
  if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(normalized)) return { key: 'g', display: 'g', multiplier: 1000 };
  if (['ml', 'mililitro', 'mililitros'].includes(normalized)) return { key: 'ml', display: 'ml', multiplier: 1 };
  if (['l', 'lt', 'litro', 'litros'].includes(normalized)) return { key: 'ml', display: 'ml', multiplier: 1000 };
  if (['u', 'ud', 'uds', 'unidad', 'unidades', 'pieza', 'piezas'].includes(normalized)) return { key: 'unidad', display: 'unidades', multiplier: 1 };
  if (['cda', 'cucharada', 'cucharadas'].includes(normalized)) return { key: 'cucharada', display: 'cucharadas', multiplier: 1 };
  if (['cdta', 'cdita', 'cucharadita', 'cucharaditas'].includes(normalized)) return { key: 'cucharadita', display: 'cucharaditas', multiplier: 1 };
  if (['al gusto', 'a gusto'].includes(normalized)) return { key: 'al gusto', display: 'al gusto', multiplier: 1 };
  return { key: normalized, display: unit, multiplier: 1 };
}

function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
