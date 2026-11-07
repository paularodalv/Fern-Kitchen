export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type MealEntryKind = 'recipe' | 'custom';

export type MealPlanEntryFields = {
  date: string;
  mealType: MealType;
  entryKind: MealEntryKind;
  recipeId: string | null;
  customMealName: string | null;
  customMealDescription: string | null;
  servings: number;
  notes: string;
  userId?: string | null;
};

export type PlannedMeal = MealPlanEntryFields & {
  id: string;
  userId: string | null;
  recipeTitle: string | null;
  recipeImageLocalUri: string | null;
  recipeExists: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListItemInput = {
  name: string;
  normalizedName: string;
  quantity: number | null;
  unit: string;
  normalizedUnit: string;
  hasQuantity: boolean;
};

export type ShoppingListItem = ShoppingListItemInput & {
  id: string;
  userId: string | null;
  weekStartDate: string;
  isPurchased: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScaledRecipeIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
};
