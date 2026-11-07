import { useSQLiteContext } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { ImageRepository } from '@/database';

export function useImageRepository() {
  const database = useSQLiteContext();
  return useMemo(() => new ImageRepository(database, Crypto.randomUUID), [database]);
}
import { useMemo } from 'react';
