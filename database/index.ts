export { migrateDatabase } from './migrations';
export { seedDemoRecipes } from './seedDemoRecipes';
export { RecipeRepository } from './repositories/RecipeRepository';

import type { SQLiteDatabase } from 'expo-sqlite';
import { migrateDatabase } from './migrations';
import { seedDemoRecipes } from './seedDemoRecipes';

export async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  await migrateDatabase(database);
  await seedDemoRecipes(database);
}
