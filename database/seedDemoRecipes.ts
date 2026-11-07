import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { demoRecipes } from '@/features/recipes/data';
import { RecipeRepository } from './repositories/RecipeRepository';

const seedKey = 'demo_recipes_v1';

export async function seedDemoRecipes(database: SQLiteDatabase): Promise<void> {
  const marker = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_metadata WHERE key = ? LIMIT 1;',
    seedKey,
  );
  if (marker) return;

  const repository = new RecipeRepository(database, Crypto.randomUUID);
  const existingRecipes = await repository.list();
  if (existingRecipes.length === 0) {
    for (const demo of demoRecipes) {
      if (!(await repository.getById(demo.id))) await repository.create(demo.fields, demo.id);
    }
  }

  await database.runAsync(
    'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?);',
    seedKey,
    '1',
  );
}
