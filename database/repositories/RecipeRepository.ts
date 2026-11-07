import type { SQLiteDatabase } from 'expo-sqlite';
import type { Recipe, RecipeFields, RecipeFilters, RecipeIngredient, RecipeStep, RecipeSummary } from '../../types/recipe';
import { RecipeNotFoundError, validateRecipeFields } from '../../features/recipes/validation.ts';
import { normalizeIngredientName } from '../../features/pantry/normalize-name.ts';

type RecipeRow = Omit<RecipeSummary, 'isFavorite'> & { favoriteFlag: number };
type IngredientRow = Omit<RecipeIngredient, 'optional'> & { optionalFlag: number };

const recipeSelect = `
  SELECT
    id,
    user_id AS userId,
    title,
    COALESCE(description, '') AS description,
    image_local_uri AS imageLocalUri,
    ideal_season AS idealSeason,
    category,
    total_minutes AS totalMinutes,
    patience_level AS patienceLevel,
    base_servings AS baseServings,
    COALESCE(grandmother_notes, '') AS grandmotherNotes,
    COALESCE(personal_notes, '') AS personalNotes,
    created_at AS createdAt,
    updated_at AS updatedAt,
    is_favorite AS favoriteFlag
  FROM recipes
`;

export class RecipeRepository {
  constructor(private readonly database: SQLiteDatabase, private readonly createUuid: () => string) {}

  async normalizeStoredIngredientNames(): Promise<void> {
    const migrationKey = 'recipe_ingredient_names_normalized_v1';
    const completed = await this.database.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_metadata WHERE key = ? LIMIT 1;',
      migrationKey,
    );
    if (completed) return;

    const rows = await this.database.getAllAsync<{ id: string; name: string }>(
      'SELECT id, name FROM recipe_ingredients;',
    );
    await this.database.withTransactionAsync(async () => {
      for (const row of rows) {
        await this.database.runAsync(
          'UPDATE recipe_ingredients SET normalized_name = ? WHERE id = ?;',
          normalizeIngredientName(row.name),
          row.id,
        );
      }
      await this.database.runAsync(
        'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?);',
        migrationKey,
        '1',
      );
    });
  }

  async list(filters: RecipeFilters = {}): Promise<RecipeSummary[]> {
    const conditions: string[] = [];
    const parameters: (string | number)[] = [];
    const search = filters.search?.trim();
    if (search) {
      conditions.push('title LIKE ? COLLATE NOCASE');
      parameters.push(`%${search.replace(/[%_\\]/g, '\\$&')}%`);
      conditions[conditions.length - 1] += " ESCAPE '\\'";
    }
    if (filters.category) {
      conditions.push('category = ? COLLATE NOCASE');
      parameters.push(filters.category);
    }
    if (filters.season) {
      conditions.push('ideal_season = ?');
      parameters.push(filters.season);
    }
    if (filters.patienceLevel) {
      conditions.push('patience_level = ?');
      parameters.push(filters.patienceLevel);
    }
    if (filters.favoritesOnly) conditions.push('is_favorite = 1');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.database.getAllAsync<RecipeRow>(
      `${recipeSelect} ${where} ORDER BY updated_at DESC, title COLLATE NOCASE ASC;`,
      ...parameters,
    );
    return rows.map(toSummary);
  }

  async listCategories(): Promise<string[]> {
    const rows = await this.database.getAllAsync<{ category: string }>(
      'SELECT DISTINCT category FROM recipes WHERE category <> \'\' ORDER BY category COLLATE NOCASE;',
    );
    return rows.map((row) => row.category);
  }

  async getById(id: string): Promise<Recipe | null> {
    const row = await this.database.getFirstAsync<RecipeRow>(`${recipeSelect} WHERE id = ? LIMIT 1;`, id);
    if (!row) return null;

    const [ingredientRows, steps] = await Promise.all([
      this.database.getAllAsync<IngredientRow>(
        `SELECT id, name, quantity, unit, is_optional AS optionalFlag
         FROM recipe_ingredients WHERE recipe_id = ? ORDER BY position ASC;`,
        id,
      ),
      this.database.getAllAsync<RecipeStep>(
        `SELECT id, step_number AS number, title, description, timer_minutes AS timerMinutes
         FROM recipe_steps WHERE recipe_id = ? ORDER BY step_number ASC;`,
        id,
      ),
    ]);

    return {
      ...toSummary(row),
      ingredients: ingredientRows.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        optional: ingredient.optionalFlag === 1,
      })),
      steps,
    };
  }

  async create(input: RecipeFields, id = this.createUuid()): Promise<Recipe> {
    const fields = validateRecipeFields(input);
    const now = new Date().toISOString();

    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO recipes (
          id, user_id, title, description, image_local_uri, ideal_season, category,
          total_minutes, patience_level, base_servings, grandmother_notes, created_at, updated_at, personal_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        id, fields.userId ?? null, fields.title, fields.description, fields.imageLocalUri,
        fields.idealSeason, fields.category, fields.totalMinutes, fields.patienceLevel,
        fields.baseServings, fields.grandmotherNotes || null, now, now, fields.personalNotes,
      );
      await this.insertChildren(id, fields);
    });

    const created = await this.getById(id);
    if (!created) throw new Error('No se pudo recuperar la receta recién creada.');
    return created;
  }

  async update(id: string, input: RecipeFields): Promise<Recipe> {
    const fields = validateRecipeFields(input);
    const now = new Date().toISOString();

    await this.database.withTransactionAsync(async () => {
      const result = await this.database.runAsync(
        `UPDATE recipes SET
          user_id = ?, title = ?, description = ?, image_local_uri = ?, ideal_season = ?,
          category = ?, total_minutes = ?, patience_level = ?, base_servings = ?,
          grandmother_notes = ?, personal_notes = ?, updated_at = ?
        WHERE id = ?;`,
        fields.userId ?? null, fields.title, fields.description, fields.imageLocalUri,
        fields.idealSeason, fields.category, fields.totalMinutes, fields.patienceLevel,
        fields.baseServings, fields.grandmotherNotes || null, fields.personalNotes, now, id,
      );
      if (result.changes === 0) throw new RecipeNotFoundError(id);

      await this.database.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?;', id);
      await this.database.runAsync('DELETE FROM recipe_steps WHERE recipe_id = ?;', id);
      await this.insertChildren(id, fields);
    });

    const updated = await this.getById(id);
    if (!updated) throw new RecipeNotFoundError(id);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.database.runAsync('DELETE FROM recipes WHERE id = ?;', id);
    if (result.changes === 0) throw new RecipeNotFoundError(id);
  }

  async setFavorite(id: string, isFavorite: boolean): Promise<void> {
    const result = await this.database.runAsync(
      'UPDATE recipes SET is_favorite = ?, updated_at = ? WHERE id = ?;',
      isFavorite ? 1 : 0,
      new Date().toISOString(),
      id,
    );
    if (result.changes === 0) throw new RecipeNotFoundError(id);
  }

  async updatePersonalNotes(id: string, notes: string): Promise<void> {
    const cleanNotes = notes.trim();
    if (cleanNotes.length > 5000) throw new Error('Las notas personales no pueden superar 5.000 caracteres.');
    const result = await this.database.runAsync(
      'UPDATE recipes SET personal_notes = ?, updated_at = ? WHERE id = ?;',
      cleanNotes,
      new Date().toISOString(),
      id,
    );
    if (result.changes === 0) throw new RecipeNotFoundError(id);
  }

  private async insertChildren(recipeId: string, fields: RecipeFields): Promise<void> {
    for (let index = 0; index < fields.ingredients.length; index += 1) {
      const ingredient = fields.ingredients[index];
      await this.database.runAsync(
        `INSERT INTO recipe_ingredients (id, recipe_id, name, normalized_name, quantity, unit, position, is_optional)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        this.createUuid(), recipeId, ingredient.name, normalizeIngredientName(ingredient.name), ingredient.quantity, ingredient.unit,
        index, ingredient.optional ? 1 : 0,
      );
    }

    for (let index = 0; index < fields.steps.length; index += 1) {
      const step = fields.steps[index];
      await this.database.runAsync(
        `INSERT INTO recipe_steps (id, recipe_id, step_number, title, description, timer_minutes)
         VALUES (?, ?, ?, ?, ?, ?);`,
        this.createUuid(), recipeId, index + 1, step.title, step.description, step.timerMinutes,
      );
    }
  }
}

function toSummary(row: RecipeRow): RecipeSummary {
  const { favoriteFlag, ...summary } = row;
  return { ...summary, isFavorite: favoriteFlag === 1 };
}

