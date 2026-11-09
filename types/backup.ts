import type { PantryItem } from './pantry';
import type { Recipe } from './recipe';

export type FernKitchenBackup = {
  format: 'fern-kitchen-backup';
  backupVersion: 1;
  schemaVersion: number;
  exportedAt: string;
  mediaIncluded: false;
  data: {
    recipes: Recipe[];
    pantryItems: PantryItem[];
  };
};

export type BackupImportResult = { recipesAdded: number; pantryItemsAdded: number; duplicatesSkipped: number };
