export { migrateDatabase } from './migrations';
export { seedDemoRecipes } from './seedDemoRecipes';
export { RecipeRepository } from './repositories/RecipeRepository';
export { PantryRepository } from './repositories/PantryRepository';
export { SeasonalProductRepository } from './repositories/SeasonalProductRepository';
export { MealPlanRepository } from './repositories/MealPlanRepository';
export { ShoppingListRepository } from './repositories/ShoppingListRepository';
export { FermentationRepository } from './repositories/FermentationRepository';
export { CollectionRepository } from './repositories/CollectionRepository';
export { ImageRepository } from './repositories/ImageRepository';

import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { migrateDatabase } from './migrations';
import { seedDemoRecipes } from './seedDemoRecipes';
import { SeasonalProductRepository } from './repositories/SeasonalProductRepository';
import { RecipeRepository } from './repositories/RecipeRepository';
import { CollectionRepository } from './repositories/CollectionRepository';

export async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  await migrateDatabase(database);
  await new RecipeRepository(database, Crypto.randomUUID).normalizeStoredIngredientNames();
  await seedDemoRecipes(database);
  await new SeasonalProductRepository(database).seedDefaults();
  await new CollectionRepository(database, Crypto.randomUUID).initialize();
}
