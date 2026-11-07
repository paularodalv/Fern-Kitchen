import { useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { MealPlanRepository } from '@/database/repositories/MealPlanRepository';

export function useMealPlanRepository(): MealPlanRepository {
  const database = useSQLiteContext();
  return useMemo(() => new MealPlanRepository(database, Crypto.randomUUID), [database]);
}
