import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { BackupRepository } from '@/database/repositories/BackupRepository';
import type { FernKitchenBackup } from '@/types/backup';
import { validateBackup } from '@/features/backup/validateBackup';

const maximumFileSize = 25 * 1024 * 1024;

export async function exportBackup(repository: BackupRepository): Promise<void> {
  const backup = await repository.exportData();
  const directory = new Directory(Paths.cache, 'backups');
  if (!directory.exists) directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `fern-kitchen-${new Date().toISOString().slice(0, 10)}.json`);
  file.create({ overwrite: true, intermediates: true });
  file.write(JSON.stringify(backup, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Guardar copia de seguridad' });
}

export async function pickAndValidateBackup(): Promise<FernKitchenBackup | null> {
  const selection = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/json'] });
  if (selection.canceled) return null;
  const file = selection.result;
  if (file.size > maximumFileSize) throw new Error('El archivo supera el tamaño máximo de 25 MB.');
  let parsed: unknown;
  try { parsed = JSON.parse(await file.text()); } catch { throw new Error('El archivo no contiene un JSON válido.'); }
  return validateBackup(parsed);
}
