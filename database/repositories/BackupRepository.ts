import type { SQLiteDatabase } from 'expo-sqlite';
import type { FernKitchenBackup, BackupImportResult } from '../../types/backup';
import type { Recipe, RecipeIngredient, RecipeStep } from '../../types/recipe';
import type { PantryItem } from '../../types/pantry';
import type { RecipeSummary } from '../../types/recipe';
import { normalizeIngredientName } from '../../features/pantry/normalize-name.ts';

type ExportRecipeRow = Omit<RecipeSummary, 'isFavorite'> & { favorite: number };

export class BackupRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async exportData(): Promise<FernKitchenBackup> {
    const recipes = await this.database.getAllAsync<ExportRecipeRow>(`SELECT id,user_id AS userId,owner_user_id AS ownerUserId,visibility,title,
      COALESCE(description,'') AS description,ideal_season AS idealSeason,category,total_minutes AS totalMinutes,
      patience_level AS patienceLevel,base_servings AS baseServings,COALESCE(grandmother_notes,'') AS grandmotherNotes,
      COALESCE(personal_notes,'') AS personalNotes,created_at AS createdAt,updated_at AS updatedAt,is_favorite AS favorite,
      NULL AS imageLocalUri FROM recipes ORDER BY created_at;`);
    const recipeModels: Recipe[] = [];
    for (const row of recipes) {
      const ingredients = await this.database.getAllAsync<RecipeIngredient>(`SELECT id,name,quantity,unit,is_optional AS optional,
        created_at AS createdAt,updated_at AS updatedAt FROM recipe_ingredients WHERE recipe_id=? ORDER BY position;`, row.id);
      const steps = await this.database.getAllAsync<RecipeStep>(`SELECT id,step_number AS number,title,description,
        timer_minutes AS timerMinutes,created_at AS createdAt,updated_at AS updatedAt FROM recipe_steps WHERE recipe_id=? ORDER BY step_number;`, row.id);
      recipeModels.push({ ...row, isFavorite: row.favorite === 1, imageLocalUri: null, ingredients, steps });
    }
    const pantryItems = await this.database.getAllAsync<PantryItem>(`SELECT id,user_id AS userId,owner_user_id AS ownerUserId,name,
      normalized_name AS normalizedName,quantity,unit,purchase_date AS purchaseDate,best_before_date AS bestBeforeDate,
      category,notes,created_at AS createdAt,updated_at AS updatedAt,NULL AS imageLocalUri FROM pantry_items ORDER BY created_at;`);
    return { format: 'fern-kitchen-backup', backupVersion: 1, schemaVersion: 11, exportedAt: new Date().toISOString(), mediaIncluded: false, data: { recipes: recipeModels, pantryItems } };
  }

  async importData(backup: FernKitchenBackup): Promise<BackupImportResult> {
    const result: BackupImportResult = { recipesAdded: 0, pantryItemsAdded: 0, duplicatesSkipped: 0 };
    await this.database.withTransactionAsync(async () => {
      for (const recipe of backup.data.recipes) {
        const existing = await this.database.getFirstAsync<{ id: string }>('SELECT id FROM recipes WHERE id=?;', recipe.id);
        if (existing) { result.duplicatesSkipped += 1; continue; }
        await this.database.runAsync(`INSERT INTO recipes (id,user_id,owner_user_id,visibility,title,description,image_local_uri,ideal_season,category,
          total_minutes,patience_level,base_servings,grandmother_notes,personal_notes,is_favorite,created_at,updated_at)
          VALUES (?,?,?,?,?,?,NULL,?,?,?,?,?,?,?,?,?,?);`, recipe.id, recipe.ownerUserId ?? recipe.userId ?? null, recipe.ownerUserId ?? recipe.userId ?? null,
          recipe.visibility ?? 'private', recipe.title, recipe.description, recipe.idealSeason, recipe.category, recipe.totalMinutes, recipe.patienceLevel,
          recipe.baseServings, recipe.grandmotherNotes, recipe.personalNotes, recipe.isFavorite ? 1 : 0, recipe.createdAt, recipe.updatedAt);
        for (let index = 0; index < recipe.ingredients.length; index += 1) {
          const item = recipe.ingredients[index];
          await this.database.runAsync(`INSERT INTO recipe_ingredients (id,recipe_id,name,normalized_name,quantity,unit,position,is_optional,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?);`, item.id, recipe.id, item.name, normalizeIngredientName(item.name), item.quantity, item.unit, index,
            item.optional ? 1 : 0, item.createdAt, item.updatedAt);
        }
        for (const step of recipe.steps) await this.database.runAsync(`INSERT INTO recipe_steps (id,recipe_id,step_number,title,description,timer_minutes,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?);`, step.id, recipe.id, step.number, step.title, step.description, step.timerMinutes, step.createdAt, step.updatedAt);
        result.recipesAdded += 1;
      }
      for (const item of backup.data.pantryItems) {
        const existing = await this.database.getFirstAsync<{ id: string }>('SELECT id FROM pantry_items WHERE id=?;', item.id);
        if (existing) { result.duplicatesSkipped += 1; continue; }
        await this.database.runAsync(`INSERT INTO pantry_items (id,user_id,owner_user_id,name,normalized_name,quantity,unit,purchase_date,best_before_date,
          category,notes,image_local_uri,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,?,?);`, item.id,
          item.ownerUserId ?? item.userId ?? null, item.ownerUserId ?? item.userId ?? null, item.name, normalizeIngredientName(item.name), item.quantity,
          item.unit, item.purchaseDate, item.bestBeforeDate, item.category, item.notes, item.createdAt, item.updatedAt);
        result.pantryItemsAdded += 1;
      }
    });
    return result;
  }
}
