import type { RecipeSummary } from '@/types/recipe';

export type RecipePreview = RecipeSummary & {
  subtitle: string;
  tone: string;
  featured?: boolean;
};
