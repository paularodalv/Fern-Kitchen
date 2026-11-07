import { useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { PantryRepository } from '@/database/repositories/PantryRepository';

export function usePantryRepository(): PantryRepository {
  const database = useSQLiteContext();
  return useMemo(() => new PantryRepository(database, Crypto.randomUUID), [database]);
}
