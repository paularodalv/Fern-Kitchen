import { useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { CollectionRepository } from '@/database/repositories/CollectionRepository';

export function useCollectionRepository(): CollectionRepository {
  const database = useSQLiteContext();
  return useMemo(() => new CollectionRepository(database, Crypto.randomUUID), [database]);
}
