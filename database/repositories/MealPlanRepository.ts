import type { SQLiteDatabase } from 'expo-sqlite';
import type { MealPlanEntryFields, PlannedMeal } from '../../types/meal-planner';
import { MealPlanEntryNotFoundError, MealSlotConflictError, validateMealPlanEntry } from '../../features/meal-planner/validation.ts';

type MealPlanRow = Omit<PlannedMeal, 'recipeExists'> & { linkedRecipeId: string | null };

const selectMeal = `SELECT
  meal.id, meal.user_id AS userId, meal.date, meal.meal_type AS mealType,
  meal.entry_kind AS entryKind, meal.recipe_id AS recipeId,
  meal.custom_meal_name AS customMealName,
  meal.custom_meal_description AS customMealDescription,
  meal.custom_meal_image_uri AS customMealImageUri,
  meal.servings, meal.notes, meal.created_at AS createdAt, meal.updated_at AS updatedAt,
  recipe.id AS linkedRecipeId, recipe.title AS recipeTitle,
  recipe.image_local_uri AS recipeImageLocalUri
  FROM meal_plan_entries AS meal
  LEFT JOIN recipes AS recipe ON recipe.id = meal.recipe_id`;

export class MealPlanRepository {
  constructor(private readonly database: SQLiteDatabase, private readonly createUuid: () => string) {}

  async listBetween(startDate: string, endDate: string): Promise<PlannedMeal[]> {
    const rows = await this.database.getAllAsync<MealPlanRow>(
      `${selectMeal} WHERE meal.date BETWEEN ? AND ?
       ORDER BY meal.date ASC,
       CASE meal.meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'snack' THEN 3 ELSE 4 END;`,
      startDate,
      endDate,
    );
    return rows.map(toPlannedMeal);
  }

  async listForDate(date: string): Promise<PlannedMeal[]> {
    return this.listBetween(date, date);
  }

  async getById(id: string): Promise<PlannedMeal | null> {
    const row = await this.database.getFirstAsync<MealPlanRow>(`${selectMeal} WHERE meal.id = ? LIMIT 1;`, id);
    return row ? toPlannedMeal(row) : null;
  }

  async create(input: MealPlanEntryFields): Promise<PlannedMeal> {
    const fields = validateMealPlanEntry(input);
    const id = this.createUuid();
    const now = new Date().toISOString();
    await this.database.withTransactionAsync(async () => {
      await this.ensureSlotIsAvailable(fields.date, fields.mealType);
      await this.insert(id, fields, now, now);
    });
    const created = await this.getById(id);
    if (!created) throw new Error('No se pudo recuperar la comida planificada.');
    return created;
  }

  async update(id: string, input: MealPlanEntryFields): Promise<PlannedMeal> {
    const fields = validateMealPlanEntry(input);
    const now = new Date().toISOString();
    await this.database.withTransactionAsync(async () => {
      const current = await this.database.getFirstAsync<{ id: string }>('SELECT id FROM meal_plan_entries WHERE id = ?;', id);
      if (!current) throw new MealPlanEntryNotFoundError(id);
      await this.ensureSlotIsAvailable(fields.date, fields.mealType, id);
      await this.database.runAsync(
        `UPDATE meal_plan_entries SET user_id = ?, date = ?, meal_type = ?, entry_kind = ?,
         recipe_id = ?, custom_meal_name = ?, custom_meal_description = ?, custom_meal_image_uri = ?, servings = ?, notes = ?, updated_at = ?
         WHERE id = ?;`,
        fields.userId ?? null, fields.date, fields.mealType, fields.entryKind, fields.recipeId,
        fields.customMealName, fields.customMealDescription, fields.customMealImageUri ?? null, fields.servings, fields.notes, now, id,
      );
    });
    const updated = await this.getById(id);
    if (!updated) throw new MealPlanEntryNotFoundError(id);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.database.runAsync('DELETE FROM meal_plan_entries WHERE id = ?;', id);
    if (result.changes === 0) throw new MealPlanEntryNotFoundError(id);
    await this.database.runAsync("DELETE FROM image_associations WHERE entity_type='meal_plan' AND entity_id=?;", id);
  }

  private async ensureSlotIsAvailable(date: string, mealType: MealPlanEntryFields['mealType'], exceptId?: string): Promise<void> {
    const conflict = await this.database.getFirstAsync<{ id: string }>(
      `SELECT id FROM meal_plan_entries WHERE date = ? AND meal_type = ? ${exceptId ? 'AND id <> ?' : ''} LIMIT 1;`,
      ...(exceptId ? [date, mealType, exceptId] : [date, mealType]),
    );
    if (conflict) throw new MealSlotConflictError(date, mealType);
  }

  private insert(id: string, fields: MealPlanEntryFields, createdAt: string, updatedAt: string): Promise<unknown> {
    return this.database.runAsync(
      `INSERT INTO meal_plan_entries
       (id, user_id, date, meal_type, entry_kind, recipe_id, custom_meal_name,
        custom_meal_description, custom_meal_image_uri, servings, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id, fields.userId ?? null, fields.date, fields.mealType, fields.entryKind, fields.recipeId,
      fields.customMealName, fields.customMealDescription, fields.customMealImageUri ?? null, fields.servings, fields.notes, createdAt, updatedAt,
    );
  }
}

function toPlannedMeal(row: MealPlanRow): PlannedMeal {
  const { linkedRecipeId, ...meal } = row;
  return { ...meal, recipeExists: meal.entryKind === 'recipe' && linkedRecipeId !== null };
}
