import { useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { FermentationRepository } from '@/database/repositories/FermentationRepository';

export function useFermentationRepository(): FermentationRepository {
  const database = useSQLiteContext();
  return useMemo(() => new FermentationRepository(database, Crypto.randomUUID), [database]);
}
