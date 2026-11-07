import type { SQLiteDatabase } from 'expo-sqlite';
import type { ShoppingListItem, ShoppingListItemInput } from '../../types/meal-planner';

type ShoppingListRow = Omit<ShoppingListItem, 'isPurchased' | 'hasQuantity'> & { purchasedFlag: number; hasQuantityFlag: number };

const selectShoppingItem = `SELECT id, user_id AS userId, week_start_date AS weekStartDate,
  name, normalized_name AS normalizedName, quantity, unit, normalized_unit AS normalizedUnit,
  has_quantity AS hasQuantityFlag, is_purchased AS purchasedFlag,
  created_at AS createdAt, updated_at AS updatedAt FROM shopping_list_items`;

export class ShoppingListRepository {
  constructor(private readonly database: SQLiteDatabase, private readonly createUuid: () => string) {}

  async listForWeek(weekStartDate: string): Promise<ShoppingListItem[]> {
    const rows = await this.database.getAllAsync<ShoppingListRow>(
      `${selectShoppingItem} WHERE week_start_date = ? ORDER BY is_purchased ASC, name COLLATE NOCASE ASC;`,
      weekStartDate,
    );
    return rows.map(toShoppingListItem);
  }

  async rebuildForWeek(weekStartDate: string, items: ShoppingListItemInput[]): Promise<void> {
    const existing = await this.listForWeek(weekStartDate);
    const existingByKey = new Map(existing.map((item) => [itemKey(item), item]));
    const now = new Date().toISOString();
    const insertedKeys = new Set<string>();

    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync('DELETE FROM shopping_list_items WHERE week_start_date = ?;', weekStartDate);
      for (const item of items) {
        const key = itemKey(item);
        if (insertedKeys.has(key)) throw new Error('La lista de compra contiene ingredientes duplicados.');
        insertedKeys.add(key);
        const previous = existingByKey.get(key);
        await this.database.runAsync(
          `INSERT INTO shopping_list_items
           (id, user_id, week_start_date, name, normalized_name, quantity, unit, normalized_unit,
            has_quantity, is_purchased, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          previous?.id ?? this.createUuid(), previous?.userId ?? null, weekStartDate, item.name,
          item.normalizedName, item.quantity, item.unit, item.normalizedUnit, item.hasQuantity ? 1 : 0,
          previous?.isPurchased ? 1 : 0, previous?.createdAt ?? now, now,
        );
      }
    });
  }

  async setPurchased(id: string, purchased: boolean): Promise<void> {
    const result = await this.database.runAsync(
      'UPDATE shopping_list_items SET is_purchased = ?, updated_at = ? WHERE id = ?;',
      purchased ? 1 : 0,
      new Date().toISOString(),
      id,
    );
    if (result.changes === 0) throw new Error('No se encontró el producto de la lista.');
  }
}

function itemKey(item: Pick<ShoppingListItemInput, 'normalizedName' | 'normalizedUnit' | 'hasQuantity'>): string {
  return `${item.normalizedName}\u0000${item.normalizedUnit}\u0000${item.hasQuantity ? '1' : '0'}`;
}

function toShoppingListItem(row: ShoppingListRow): ShoppingListItem {
  const { purchasedFlag, hasQuantityFlag, ...item } = row;
  return { ...item, isPurchased: purchasedFlag === 1, hasQuantity: hasQuantityFlag === 1 };
}
