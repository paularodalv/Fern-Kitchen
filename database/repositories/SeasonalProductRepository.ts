import type { SQLiteDatabase } from 'expo-sqlite';
import { getSeasonalProductSeeds } from '../../features/pantry/seasonal-data.ts';
import type { Season, SeasonalProduct } from '../../types/pantry';

export class SeasonalProductRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async seedDefaults(): Promise<void> {
    for (const item of getSeasonalProductSeeds()) {
      await this.database.runAsync(
        `INSERT OR IGNORE INTO seasonal_products
         (id, season, name, normalized_name, category, note, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        item.id, item.season, item.name, item.normalizedName, item.category, item.note, item.sortOrder,
      );
    }
  }

  list(season: Season): Promise<SeasonalProduct[]> {
    return this.database.getAllAsync<SeasonalProduct>(
      `SELECT id, season, name, normalized_name AS normalizedName, category, note
       FROM seasonal_products WHERE season = ? ORDER BY sort_order ASC, name COLLATE NOCASE ASC;`,
      season,
    );
  }

  async listSeasons(): Promise<Season[]> {
    const rows = await this.database.getAllAsync<{ season: Season }>(
      'SELECT DISTINCT season FROM seasonal_products ORDER BY CASE season WHEN \'Primavera\' THEN 1 WHEN \'Verano\' THEN 2 WHEN \'Otoño\' THEN 3 ELSE 4 END;',
    );
    return rows.map((row) => row.season);
  }
}
