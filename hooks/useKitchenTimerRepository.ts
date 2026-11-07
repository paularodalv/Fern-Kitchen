import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { KitchenTimerRepository } from '@/database/repositories/KitchenTimerRepository';

export function useKitchenTimerRepository(): KitchenTimerRepository {
  const database = useSQLiteContext();
  return useMemo(() => new KitchenTimerRepository(database), [database]);
}
