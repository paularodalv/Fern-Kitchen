import type { SQLiteDatabase } from 'expo-sqlite';

type Migration = { version: number; sql: string };

const migrations: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE recipes (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX recipes_user_id_idx ON recipes(user_id);
      CREATE TABLE recipe_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        quantity REAL,
        unit TEXT,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX recipe_ingredients_recipe_id_idx ON recipe_ingredients(recipe_id);
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE recipes ADD COLUMN image_local_uri TEXT;
      ALTER TABLE recipes ADD COLUMN ideal_season TEXT NOT NULL DEFAULT 'Todo el año';
      ALTER TABLE recipes ADD COLUMN category TEXT NOT NULL DEFAULT 'General';
      ALTER TABLE recipes ADD COLUMN total_minutes INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE recipes ADD COLUMN patience_level TEXT NOT NULL DEFAULT 'Media'
        CHECK (patience_level IN ('Baja', 'Media', 'Alta'));
      ALTER TABLE recipes ADD COLUMN base_servings INTEGER NOT NULL DEFAULT 4
        CHECK (base_servings > 0);
      ALTER TABLE recipes ADD COLUMN grandmother_notes TEXT;
      ALTER TABLE recipes ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0
        CHECK (is_favorite IN (0, 1));
      ALTER TABLE recipe_ingredients ADD COLUMN is_optional INTEGER NOT NULL DEFAULT 0
        CHECK (is_optional IN (0, 1));
      CREATE TABLE recipe_steps (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL CHECK (step_number > 0),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        timer_minutes INTEGER CHECK (timer_minutes IS NULL OR timer_minutes > 0),
        UNIQUE (recipe_id, step_number)
      );
      CREATE INDEX recipe_steps_recipe_id_idx ON recipe_steps(recipe_id, step_number);
      CREATE TABLE app_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE INDEX recipes_search_title_idx ON recipes(title COLLATE NOCASE);
      CREATE INDEX recipes_category_idx ON recipes(category);
      CREATE INDEX recipes_season_idx ON recipes(ideal_season);
      CREATE INDEX recipes_patience_idx ON recipes(patience_level);
      CREATE INDEX recipes_favorite_idx ON recipes(is_favorite);
    `,
  },
  {
    version: 3,
    sql: `
      ALTER TABLE recipes ADD COLUMN personal_notes TEXT NOT NULL DEFAULT '';
      CREATE TABLE kitchen_timers (
        id TEXT PRIMARY KEY NOT NULL,
        recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        step_id TEXT NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'paused', 'completed')),
        remaining_ms INTEGER NOT NULL CHECK (remaining_ms >= 0),
        target_end_at INTEGER,
        notification_id TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE(step_id),
        CHECK ((status = 'running' AND target_end_at IS NOT NULL) OR status <> 'running')
      );
      CREATE INDEX kitchen_timers_recipe_id_idx ON kitchen_timers(recipe_id);
    `,
  },
];

export async function migrateDatabase(database: SQLiteDatabase): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON;');
  const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let version = result?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= version) continue;
    await database.withTransactionAsync(async () => {
      await database.execAsync(migration.sql);
      await database.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
    version = migration.version;
  }
}
