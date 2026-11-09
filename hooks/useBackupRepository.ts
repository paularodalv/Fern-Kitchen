import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { BackupRepository } from '@/database/repositories/BackupRepository';

export function useBackupRepository(): BackupRepository {
  const database = useSQLiteContext();
  return useMemo(() => new BackupRepository(database), [database]);
}
