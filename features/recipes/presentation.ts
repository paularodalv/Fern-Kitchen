import type { RecipeSummary } from '@/types/recipe';
import type { RecipePreview } from './types';

const seasonTones: Record<string, string> = {
  Primavera: '#E5EFD9',
  Verano: '#F2D6BD',
  Otoño: '#EBC7A6',
  Invierno: '#DCE7DD',
  'Todo el año': '#E6EACB',
};

export function toRecipePreview(recipe: RecipeSummary, featured = false): RecipePreview {
  const description = recipe.description.trim();
  const subtitle = description.length > 54 ? `${description.slice(0, 51).trimEnd()}…` : description || recipe.category;
  return { ...recipe, subtitle, tone: seasonTones[recipe.idealSeason] ?? '#E5EFD9', featured };
}

export function toRecipePreviews(recipes: RecipeSummary[], featuredIds: string[] = []): RecipePreview[] {
  return recipes.map((recipe) => toRecipePreview(recipe, featuredIds.includes(recipe.id)));
}
