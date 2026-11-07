import { useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { ShoppingListRepository } from '@/database/repositories/ShoppingListRepository';

export function useShoppingListRepository(): ShoppingListRepository {
  const database = useSQLiteContext();
  return useMemo(() => new ShoppingListRepository(database, Crypto.randomUUID), [database]);
}
