import type { SQLiteDatabase } from 'expo-sqlite';
import type { PantryFilters, PantryItem, PantryItemFields } from '../../types/pantry';
import { PantryItemNotFoundError, validatePantryItem } from '../../features/pantry/validation.ts';

const selectPantryItem = `SELECT id, user_id AS userId, name, normalized_name AS normalizedName,
  quantity, unit, purchase_date AS purchaseDate, best_before_date AS bestBeforeDate,
  category, notes, created_at AS createdAt, updated_at AS updatedAt FROM pantry_items`;

export class PantryRepository {
  constructor(private readonly database: SQLiteDatabase, private readonly createUuid: () => string) {}

  async list(filters: PantryFilters = {}): Promise<PantryItem[]> {
    const conditions: string[] = [];
    const parameters: (string | number)[] = [];
    if (filters.category) {
      conditions.push('category = ? COLLATE NOCASE');
      parameters.push(filters.category);
    }
    const search = filters.search?.trim();
    if (search) {
      conditions.push("name LIKE ? ESCAPE '\\' COLLATE NOCASE");
      parameters.push(`%${search.replace(/[%_\\]/g, '\\$&')}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return this.database.getAllAsync<PantryItem>(`${selectPantryItem} ${where} ORDER BY category COLLATE NOCASE, name COLLATE NOCASE;`, ...parameters);
  }

  async listCategories(): Promise<string[]> {
    const rows = await this.database.getAllAsync<{ category: string }>(
      "SELECT DISTINCT category FROM pantry_items WHERE category <> '' ORDER BY category COLLATE NOCASE;",
    );
    return rows.map((row) => row.category);
  }

  async count(): Promise<number> {
    const result = await this.database.getFirstAsync<{ total: number }>('SELECT count(*) AS total FROM pantry_items;');
    return result?.total ?? 0;
  }

  getById(id: string): Promise<PantryItem | null> {
    return this.database.getFirstAsync<PantryItem>(`${selectPantryItem} WHERE id = ? LIMIT 1;`, id);
  }

  async create(input: PantryItemFields): Promise<PantryItem> {
    const fields = validatePantryItem(input);
    const id = this.createUuid();
    const now = new Date().toISOString();
    await this.database.runAsync(
      `INSERT INTO pantry_items
       (id, user_id, name, normalized_name, quantity, unit, purchase_date, best_before_date,
        category, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      id, fields.userId ?? null, fields.name, fields.normalizedName, fields.quantity, fields.unit,
      fields.purchaseDate, fields.bestBeforeDate, fields.category, fields.notes, now, now,
    );
    const created = await this.getById(id);
    if (!created) throw new Error('No se pudo recuperar el ingrediente guardado.');
    return created;
  }

  async update(id: string, input: PantryItemFields): Promise<PantryItem> {
    const fields = validatePantryItem(input);
    const result = await this.database.runAsync(
      `UPDATE pantry_items SET user_id = ?, name = ?, normalized_name = ?, quantity = ?, unit = ?,
       purchase_date = ?, best_before_date = ?, category = ?, notes = ?, updated_at = ? WHERE id = ?;`,
      fields.userId ?? null, fields.name, fields.normalizedName, fields.quantity, fields.unit,
      fields.purchaseDate, fields.bestBeforeDate, fields.category, fields.notes, new Date().toISOString(), id,
    );
    if (result.changes === 0) throw new PantryItemNotFoundError(id);
    const updated = await this.getById(id);
    if (!updated) throw new PantryItemNotFoundError(id);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.database.runAsync('DELETE FROM pantry_items WHERE id = ?;', id);
    if (result.changes === 0) throw new PantryItemNotFoundError(id);
  }
}
