import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { SeasonalProductRepository } from '@/database/repositories/SeasonalProductRepository';

export function useSeasonalProductRepository(): SeasonalProductRepository {
  const database = useSQLiteContext();
  return useMemo(() => new SeasonalProductRepository(database), [database]);
}
