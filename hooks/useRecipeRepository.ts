import { useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { RecipeRepository } from '@/database/repositories/RecipeRepository';

export function useRecipeRepository(): RecipeRepository {
  const database = useSQLiteContext();
  return useMemo(() => new RecipeRepository(database, Crypto.randomUUID), [database]);
}
