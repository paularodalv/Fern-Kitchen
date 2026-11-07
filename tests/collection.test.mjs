import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateDatabase } from '../database/migrations.ts';
import { CollectionRepository } from '../database/repositories/CollectionRepository.ts';

function openDatabase(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  const database = {
    execAsync: async (sql) => sqlite.exec(sql),
    runAsync: async (sql, ...params) => { const result = sqlite.prepare(sql).run(...params); return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) }; },
    getAllAsync: async (sql, ...params) => sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params) ?? null,
    withTransactionAsync: async (callback) => { sqlite.exec('BEGIN'); try { await callback(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
  };
  return { sqlite, database };
}

function uuidSequence() { let value = 1; return () => '70000000-0000-4000-8000-' + String(value++).padStart(12, '0'); }
function localDate() { const today = new Date(); return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'); }

test('collection migration preserves Fern Kitchen data and collection state survives a database restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'fern-collection-'));
  const filename = join(directory, 'fern.db');
  let sqlite;
  try {
    let opened = openDatabase(filename); sqlite = opened.sqlite; let { database } = opened;
    await migrateDatabase(database);
    await database.runAsync("INSERT INTO recipes(id,title,created_at,updated_at,is_favorite) VALUES('recipe-a','Pan de casa','2026-11-01','2026-11-01',1);");
    await database.runAsync("INSERT INTO pantry_items(id,name,normalized_name,quantity,unit,category,created_at,updated_at) VALUES('pantry-a','Harina','harina',500,'g','Despensa','2026-11-01','2026-11-01');");
    await database.runAsync("INSERT INTO fermentation_projects(id,name,fermentation_type,status,start_date,created_at,updated_at) VALUES('ferment-a','Masa madre','sourdough','active','2026-11-01','2026-11-01','2026-11-01');");
    const repo = new CollectionRepository(database, uuidSequence());
    await repo.initialize();
    await repo.recordAction('prepared_recipe', 'recipe-a');
    const beforeClose = await repo.getSnapshot();
    sqlite.close();

    opened = openDatabase(filename); sqlite = opened.sqlite; database = opened.database;
    await migrateDatabase(database);
    const afterRestart = await new CollectionRepository(database, uuidSequence()).getSnapshot();
    assert.equal(afterRestart.xp, beforeClose.xp);
    assert.equal(afterRestart.achievements.find((item) => item.id === 'first-prepared-recipe').isCompleted, 1);
    assert.equal((await database.getFirstAsync('SELECT is_favorite FROM recipes WHERE id=?;', 'recipe-a')).is_favorite, 1);
    assert.equal((await database.getFirstAsync('SELECT COUNT(*) AS count FROM pantry_items')).count, 1);
    assert.equal((await database.getFirstAsync('SELECT COUNT(*) AS count FROM fermentation_projects')).count, 1);
  } finally { sqlite?.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('recipe preparation awards are idempotent, achievements use distinct real recipe actions, and level thresholds advance', async () => {
  const { sqlite, database } = openDatabase();
  try {
    await migrateDatabase(database);
    const repo = new CollectionRepository(database, uuidSequence());
    await repo.initialize();
    await repo.recordAction('prepared_recipe', 'recipe-a');
    await repo.recordAction('prepared_recipe', 'recipe-a');
    let snapshot = await repo.getSnapshot();
    assert.equal(snapshot.xp, 50);
    assert.equal(snapshot.achievements.find((item) => item.id === 'first-prepared-recipe').isCompleted, 1);
    assert.equal(snapshot.stickers.find((item) => item.id === 'bread-loaf').unlockedAt !== null, true);

    await repo.recordAction('prepared_recipe', 'recipe-b');
    await repo.recordAction('prepared_recipe', 'recipe-c');
    snapshot = await repo.getSnapshot();
    assert.equal(snapshot.achievements.find((item) => item.id === 'three-recipes-prepared').isCompleted, 1);
    assert.ok(snapshot.level >= 2);
    assert.equal(await database.getFirstAsync("SELECT COUNT(*) AS count FROM experience_events WHERE action_key='prepared_recipe:recipe-a';").then((row) => row.count), 1);
  } finally { sqlite.close(); }
});

test('personal recipes complete date-bound event challenges once and unlock event rewards', async () => {
  const { sqlite, database } = openDatabase();
  try {
    await migrateDatabase(database);
    const repo = new CollectionRepository(database, uuidSequence());
    await repo.initialize();
    const today = localDate();
    await database.runAsync("UPDATE seasonal_event_definitions SET starts_at=?,ends_at=? WHERE id='autumn-table';",today,today);
    await repo.recordAction('personal_recipe', 'personal-a');
    await repo.recordAction('autumn_recipe', 'personal-a');
    await repo.recordAction('autumn_recipe', 'personal-a');
    const snapshot = await repo.getSnapshot();
    const autumn = snapshot.events.find((event) => event.id === 'autumn-table');
    assert.equal(autumn?.challenges[0]?.isCompleted, 1);
    assert.equal(snapshot.stickers.find((item) => item.id === 'autumn-leaf')?.unlockedAt !== null, true);
    assert.equal((await database.getFirstAsync("SELECT COUNT(*) AS count FROM user_event_rewards WHERE event_id='autumn-table';")).count, 1);
  } finally { sqlite.close(); }
});

test('replaying a previously prepared recipe during an active event advances its challenge without awarding XP again', async () => {
  const { sqlite, database } = openDatabase();
  try {
    await migrateDatabase(database);
    const repo = new CollectionRepository(database, uuidSequence());
    await repo.initialize();
    await repo.recordAction('prepared_recipe', 'recipe-a');
    const xpBeforeEvent = (await repo.getSnapshot()).xp;
    const today = localDate();
    await database.runAsync("UPDATE seasonal_event_definitions SET starts_at=?,ends_at=? WHERE id='bread-week';",today,today);
    await repo.recordAction('prepared_recipe', 'recipe-a');
    await repo.recordAction('prepared_recipe', 'recipe-a');
    const snapshot = await repo.getSnapshot();
    assert.equal(snapshot.xp, xpBeforeEvent + 20);
    assert.equal(snapshot.events.find((item) => item.id === 'bread-week')?.challenges[0]?.isCompleted, 1);
    assert.equal((await database.getFirstAsync("SELECT COUNT(*) AS count FROM user_event_actions WHERE challenge_id='bread-week-loaf';")).count, 1);
  } finally { sqlite.close(); }
});

test('cosmetics require ownership, recipe design selections persist, and locked styles cannot be selected', async () => {
  const { sqlite, database } = openDatabase();
  try {
    await migrateDatabase(database);
    const repo = new CollectionRepository(database, uuidSequence());
    await repo.initialize();
    await assert.rejects(repo.equipCosmetic('frame', 'frame-gold'), /no está desbloqueado/);
    await repo.recordAction('prepared_recipe', 'recipe-a');
    await repo.recordAction('prepared_recipe', 'recipe-b');
    await repo.recordAction('prepared_recipe', 'recipe-c');
    await repo.equipCosmetic('frame', 'frame-gold');
    await assert.rejects(repo.selectRecipeDesign('autumn'), /no está desbloqueado/);
    await database.runAsync("INSERT INTO recipes(id,title,created_at,updated_at) VALUES('recipe-a','Mi receta','2026-11-07','2026-11-07');");
    await repo.selectRecipeDesign('artisan', 'recipe-a');
    assert.equal(await repo.getRecipeDesign('recipe-a'), 'artisan');
    await repo.resetCustomization();
    const snapshot = await repo.getSnapshot();
    assert.equal(snapshot.customization.frameId, 'frame-fern');
  } finally { sqlite.close(); }
});

test('fermentation XP has a weekly limit and a completion milestone is awarded once', async () => {
  const { sqlite, database } = openDatabase();
  try {
    await migrateDatabase(database);
    const repo = new CollectionRepository(database, uuidSequence());
    await repo.initialize();
    await repo.recordAction('fermentation_event', 'event-a');
    await repo.recordAction('fermentation_event', 'event-a');
    await repo.recordAction('fermentation_event', 'event-b');
    await repo.recordAction('fermentation_event', 'event-c');
    await repo.recordAction('fermentation_event', 'event-d');
    await repo.recordAction('fermentation_completed', 'project-a');
    await repo.recordAction('fermentation_completed', 'project-a');
    const snapshot = await repo.getSnapshot();
    assert.equal(snapshot.achievements.find((item) => item.id === 'first-fermentation')?.isCompleted, 1);
    assert.equal(snapshot.achievements.find((item) => item.id === 'completed-fermentation')?.isCompleted, 1);
    assert.equal((await database.getFirstAsync("SELECT COUNT(*) AS count FROM experience_events WHERE event_type='fermentation_event';")).count, 3);
    assert.equal((await database.getFirstAsync("SELECT COUNT(*) AS count FROM experience_events WHERE event_type='fermentation_completed';")).count, 1);
  } finally { sqlite.close(); }
});
