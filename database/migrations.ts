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
  {
    version: 4,
    sql: `
      ALTER TABLE recipe_ingredients ADD COLUMN normalized_name TEXT NOT NULL DEFAULT '';
      UPDATE recipe_ingredients SET normalized_name = lower(trim(name));
      CREATE TABLE pantry_items (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        normalized_name TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity >= 0),
        unit TEXT NOT NULL,
        purchase_date TEXT,
        best_before_date TEXT,
        category TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX pantry_items_user_id_idx ON pantry_items(user_id);
      CREATE INDEX pantry_items_normalized_name_idx ON pantry_items(normalized_name);
      CREATE INDEX pantry_items_category_idx ON pantry_items(category);
      CREATE INDEX pantry_items_best_before_idx ON pantry_items(best_before_date);
      CREATE TABLE seasonal_products (
        id TEXT PRIMARY KEY NOT NULL,
        season TEXT NOT NULL CHECK (season IN ('Primavera', 'Verano', 'Otoño', 'Invierno')),
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        category TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        UNIQUE (season, normalized_name)
      );
      CREATE INDEX seasonal_products_season_idx ON seasonal_products(season, sort_order);
      CREATE INDEX seasonal_products_normalized_name_idx ON seasonal_products(normalized_name);
    `,
  },
  {
    version: 5,
    sql: `
      CREATE TABLE meal_plan_entries (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner')),
        entry_kind TEXT NOT NULL CHECK (entry_kind IN ('recipe', 'custom')),
        recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
        custom_meal_name TEXT,
        custom_meal_description TEXT,
        servings INTEGER NOT NULL CHECK (servings BETWEEN 1 AND 100),
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (entry_kind <> 'custom' OR (recipe_id IS NULL AND length(trim(custom_meal_name)) > 0)),
        CHECK (entry_kind <> 'recipe' OR (custom_meal_name IS NULL AND custom_meal_description IS NULL))
      );
      CREATE UNIQUE INDEX meal_plan_date_type_unique_idx ON meal_plan_entries(date, meal_type);
      CREATE INDEX meal_plan_date_idx ON meal_plan_entries(date);
      CREATE INDEX meal_plan_recipe_id_idx ON meal_plan_entries(recipe_id);
      CREATE TABLE shopping_list_items (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        week_start_date TEXT NOT NULL,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        quantity REAL,
        unit TEXT NOT NULL DEFAULT '',
        normalized_unit TEXT NOT NULL DEFAULT '',
        has_quantity INTEGER NOT NULL CHECK (has_quantity IN (0, 1)),
        is_purchased INTEGER NOT NULL DEFAULT 0 CHECK (is_purchased IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (week_start_date, normalized_name, normalized_unit, has_quantity)
      );
      CREATE INDEX shopping_list_week_idx ON shopping_list_items(week_start_date, is_purchased);
      CREATE INDEX shopping_list_normalized_name_idx ON shopping_list_items(normalized_name);
    `,
  },
  {
    version: 6,
    sql: `
      CREATE TABLE fermentation_projects (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        fermentation_type TEXT NOT NULL,
        custom_type_name TEXT,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'observing', 'paused', 'completed', 'discarded')),
        start_date TEXT NOT NULL,
        expected_duration_days INTEGER CHECK (expected_duration_days IS NULL OR expected_duration_days > 0),
        temperature_notes TEXT NOT NULL DEFAULT '',
        initial_photo_uri TEXT,
        personal_notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX fermentation_projects_user_status_idx ON fermentation_projects(user_id, status);
      CREATE INDEX fermentation_projects_updated_idx ON fermentation_projects(updated_at DESC);
      CREATE INDEX fermentation_projects_type_idx ON fermentation_projects(fermentation_type);

      CREATE TABLE fermentation_batches (
        id TEXT PRIMARY KEY NOT NULL,
        project_id TEXT NOT NULL REFERENCES fermentation_projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        completion_date TEXT,
        status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'observing', 'paused', 'completed', 'discarded')),
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX fermentation_batches_project_idx ON fermentation_batches(project_id, start_date);
      CREATE INDEX fermentation_batches_status_idx ON fermentation_batches(status);

      CREATE TABLE fermentation_events (
        id TEXT PRIMARY KEY NOT NULL,
        project_id TEXT NOT NULL REFERENCES fermentation_projects(id) ON DELETE CASCADE,
        batch_id TEXT REFERENCES fermentation_batches(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL CHECK (event_type IN ('preparation', 'feeding', 'measurement', 'observation', 'status_change', 'completion', 'note')),
        event_date TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        measurements_json TEXT NOT NULL DEFAULT '[]',
        ingredients_json TEXT NOT NULL DEFAULT '[]',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        CHECK (batch_id IS NULL OR project_id IS NOT NULL)
      );
      CREATE INDEX fermentation_events_project_date_idx ON fermentation_events(project_id, event_date DESC);
      CREATE INDEX fermentation_events_batch_date_idx ON fermentation_events(batch_id, event_date DESC);
      CREATE INDEX fermentation_events_type_idx ON fermentation_events(event_type);

      CREATE TABLE fermentation_reminders (
        id TEXT PRIMARY KEY NOT NULL,
        project_id TEXT NOT NULL REFERENCES fermentation_projects(id) ON DELETE CASCADE,
        batch_id TEXT REFERENCES fermentation_batches(id) ON DELETE CASCADE,
        title TEXT NOT NULL CHECK (length(trim(title)) > 0),
        task_type TEXT NOT NULL CHECK (task_type IN ('feeding', 'check', 'measurement', 'tasting', 'custom')),
        scheduled_at TEXT NOT NULL,
        notification_id TEXT,
        is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX fermentation_reminders_due_idx ON fermentation_reminders(is_completed, scheduled_at);
      CREATE INDEX fermentation_reminders_project_idx ON fermentation_reminders(project_id, scheduled_at);

      CREATE TABLE fermentation_photos (
        id TEXT PRIMARY KEY NOT NULL,
        project_id TEXT NOT NULL REFERENCES fermentation_projects(id) ON DELETE CASCADE,
        batch_id TEXT REFERENCES fermentation_batches(id) ON DELETE CASCADE,
        event_id TEXT REFERENCES fermentation_events(id) ON DELETE CASCADE,
        local_uri TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX fermentation_photos_project_idx ON fermentation_photos(project_id, created_at DESC);
      CREATE INDEX fermentation_photos_batch_idx ON fermentation_photos(batch_id, created_at DESC);

      CREATE TABLE fermentation_ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        project_id TEXT NOT NULL REFERENCES fermentation_projects(id) ON DELETE CASCADE,
        batch_id TEXT REFERENCES fermentation_batches(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        quantity REAL CHECK (quantity IS NULL OR quantity >= 0),
        unit TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        CHECK (batch_id IS NULL OR project_id IS NOT NULL)
      );
      CREATE INDEX fermentation_ingredients_project_idx ON fermentation_ingredients(project_id);
      CREATE INDEX fermentation_ingredients_batch_idx ON fermentation_ingredients(batch_id);

      CREATE TABLE fermentation_custom_fields (
        id TEXT PRIMARY KEY NOT NULL,
        project_id TEXT NOT NULL REFERENCES fermentation_projects(id) ON DELETE CASCADE,
        batch_id TEXT REFERENCES fermentation_batches(id) ON DELETE CASCADE,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'measurement', 'date', 'boolean')),
        unit TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX fermentation_custom_fields_project_idx ON fermentation_custom_fields(project_id);
      CREATE INDEX fermentation_custom_fields_batch_idx ON fermentation_custom_fields(batch_id);

      CREATE TABLE fermentation_custom_field_values (
        id TEXT PRIMARY KEY NOT NULL,
        field_id TEXT NOT NULL REFERENCES fermentation_custom_fields(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL REFERENCES fermentation_events(id) ON DELETE CASCADE,
        value_text TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX fermentation_custom_field_history_idx ON fermentation_custom_field_values(field_id, recorded_at DESC);
    `,
  },
  {
    version: 7,
    sql: `
      CREATE TABLE collection_profiles (id TEXT PRIMARY KEY NOT NULL, user_id TEXT, display_name TEXT NOT NULL DEFAULT 'Mi cocina', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE user_progress (profile_id TEXT PRIMARY KEY NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, total_xp INTEGER NOT NULL DEFAULT 0 CHECK(total_xp >= 0), updated_at TEXT NOT NULL);
      CREATE TABLE experience_events (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, user_id TEXT, event_type TEXT NOT NULL, source_type TEXT NOT NULL, source_id TEXT NOT NULL, action_key TEXT NOT NULL UNIQUE, xp_delta INTEGER NOT NULL CHECK(xp_delta > 0), created_at TEXT NOT NULL);
      CREATE INDEX experience_events_profile_date_idx ON experience_events(profile_id, created_at DESC);
      CREATE TABLE achievement_definitions (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, icon TEXT NOT NULL, hint TEXT NOT NULL, xp_reward INTEGER NOT NULL DEFAULT 0, cosmetic_id TEXT, sort_order INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE user_achievements (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, user_id TEXT, achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE, progress INTEGER NOT NULL DEFAULT 0, is_completed INTEGER NOT NULL DEFAULT 0 CHECK(is_completed IN (0,1)), unlocked_at TEXT, notified_at TEXT, UNIQUE(profile_id, achievement_id));
      CREATE TABLE sticker_definitions (id TEXT PRIMARY KEY NOT NULL, collection_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, asset_path TEXT NOT NULL, icon TEXT NOT NULL, unlock_type TEXT NOT NULL, unlock_value TEXT NOT NULL, rarity TEXT NOT NULL DEFAULT 'comun', sort_order INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE user_stickers (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, user_id TEXT, sticker_id TEXT NOT NULL REFERENCES sticker_definitions(id) ON DELETE CASCADE, unlocked_at TEXT NOT NULL, UNIQUE(profile_id, sticker_id));
      CREATE TABLE cosmetic_definitions (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, asset_path TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL, is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0,1)), unlock_type TEXT NOT NULL DEFAULT 'default', unlock_value TEXT NOT NULL DEFAULT '');
      CREATE TABLE user_cosmetics (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, user_id TEXT, cosmetic_id TEXT NOT NULL REFERENCES cosmetic_definitions(id) ON DELETE CASCADE, unlocked_at TEXT NOT NULL, UNIQUE(profile_id, cosmetic_id));
      CREATE TABLE user_customization (profile_id TEXT PRIMARY KEY NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, frame_id TEXT REFERENCES cosmetic_definitions(id), background_id TEXT REFERENCES cosmetic_definitions(id), accessory_id TEXT REFERENCES cosmetic_definitions(id), displayed_achievement_id TEXT REFERENCES achievement_definitions(id), displayed_sticker_id TEXT REFERENCES sticker_definitions(id), updated_at TEXT NOT NULL);
      CREATE TABLE recipe_design_definitions (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, accent_color TEXT NOT NULL, background_color TEXT NOT NULL, icon TEXT NOT NULL, unlock_type TEXT NOT NULL DEFAULT 'default', unlock_value TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE recipe_design_selections (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, user_id TEXT, recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE, design_id TEXT NOT NULL REFERENCES recipe_design_definitions(id), updated_at TEXT NOT NULL, UNIQUE(profile_id, recipe_id));
      CREATE TABLE seasonal_event_definitions (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, banner_asset TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL, reward_label TEXT NOT NULL DEFAULT '');
      CREATE TABLE seasonal_event_challenges (id TEXT PRIMARY KEY NOT NULL, event_id TEXT NOT NULL REFERENCES seasonal_event_definitions(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT NOT NULL, action_type TEXT NOT NULL, target_count INTEGER NOT NULL CHECK(target_count > 0), reward_xp INTEGER NOT NULL DEFAULT 0, sticker_id TEXT REFERENCES sticker_definitions(id), sort_order INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE user_event_progress (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, user_id TEXT, challenge_id TEXT NOT NULL REFERENCES seasonal_event_challenges(id) ON DELETE CASCADE, progress INTEGER NOT NULL DEFAULT 0, is_completed INTEGER NOT NULL DEFAULT 0 CHECK(is_completed IN (0,1)), completed_at TEXT, UNIQUE(profile_id, challenge_id));
      CREATE TABLE user_event_rewards (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, user_id TEXT, event_id TEXT NOT NULL REFERENCES seasonal_event_definitions(id) ON DELETE CASCADE, reward_key TEXT NOT NULL, unlocked_at TEXT NOT NULL, UNIQUE(profile_id, event_id, reward_key));
      CREATE INDEX user_achievement_profile_idx ON user_achievements(profile_id, is_completed);
      CREATE INDEX user_sticker_profile_idx ON user_stickers(profile_id);
      CREATE INDEX user_event_progress_profile_idx ON user_event_progress(profile_id, challenge_id);
    `,
  },
  {
    version: 8,
    sql: `
      CREATE TABLE sticker_collection_definitions (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, completion_reward TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE collection_actions (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, user_id TEXT, action_type TEXT NOT NULL, source_id TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(profile_id, action_type, source_id));
      CREATE TABLE user_event_actions (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL REFERENCES collection_profiles(id) ON DELETE CASCADE, user_id TEXT, challenge_id TEXT NOT NULL REFERENCES seasonal_event_challenges(id) ON DELETE CASCADE, source_id TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(profile_id, challenge_id, source_id));
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
