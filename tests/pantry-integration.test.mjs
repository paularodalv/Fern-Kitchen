import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../database/migrations.ts';
import { PantryRepository } from '../database/repositories/PantryRepository.ts';
import { SeasonalProductRepository } from '../database/repositories/SeasonalProductRepository.ts';

function createDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  const database = {
    execAsync: async (sql) => sqlite.exec(sql),
    runAsync: async (sql, ...params) => {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getAllAsync: async (sql, ...params) => sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params) ?? null,
    withTransactionAsync: async (callback) => {
      sqlite.exec('BEGIN');
      try { await callback(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { sqlite, database };
}

function uuidSequence() {
  let value = 1;
  return () => `10000000-0000-4000-8000-${String(value++).padStart(12, '0')}`;
}

const pantryDraft = (overrides = {}) => ({
  name: '  Pimientos   rojos ',
  quantity: 3,
  unit: 'unidades',
  purchaseDate: '2026-11-02',
  bestBeforeDate: '2026-11-20',
  category: 'Verdura',
  notes: 'Cajón inferior',
  ...overrides,
});

test('pantry items create, normalize, search, edit, filter and delete in SQLite', async () => {
  const { sqlite, database } = createDatabase();
  try {
    await migrateDatabase(database);
    const repository = new PantryRepository(database, uuidSequence());
    const created = await repository.create(pantryDraft());
    assert.match(created.id, /^[0-9a-f-]{36}$/i);
    assert.equal(created.name, 'Pimientos rojos');
    assert.equal(created.normalizedName, 'pimientos rojos');
    assert.equal((await repository.list({ search: 'pimientos' })).length, 1);
    assert.deepEqual(await repository.listCategories(), ['Verdura']);

    const edited = await repository.update(created.id, pantryDraft({ name: 'Limón', quantity: 6, unit: 'uds', category: 'Fruta', purchaseDate: null, notes: '' }));
    assert.equal(edited.name, 'Limón');
    assert.equal(edited.normalizedName, 'limón');
    assert.equal(edited.quantity, 6);
    assert.equal(edited.purchaseDate, null);
    assert.equal((await repository.list({ category: 'Fruta' })).length, 1);
    assert.equal((await repository.list({ search: 'pimientos' })).length, 0);

    await repository.delete(created.id);
    assert.equal((await repository.list()).length, 0);
    await assert.rejects(repository.delete(created.id), /No se encontró/);
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM seasonal_products').get().total, 0);
  } finally { sqlite.close(); }
});

test('seasonal catalog is seeded into its own table and can be browsed by season', async () => {
  const { sqlite, database } = createDatabase();
  try {
    await migrateDatabase(database);
    const repository = new SeasonalProductRepository(database);
    await repository.seedDefaults();
    await repository.seedDefaults();
    const seasons = await repository.listSeasons();
    assert.deepEqual(seasons, ['Primavera', 'Verano', 'Otoño', 'Invierno']);
    const summer = await repository.list('Verano');
    assert.ok(summer.some((product) => product.name === 'Tomates'));
    assert.ok(summer.every((product) => product.season === 'Verano'));
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM pantry_items').get().total, 0);
    assert.ok(sqlite.prepare('SELECT count(*) AS total FROM seasonal_products').get().total > 20);
  } finally { sqlite.close(); }
});

test('pantry validation rejects malformed dates, quantities and missing names', async () => {
  const { sqlite, database } = createDatabase();
  try {
    await migrateDatabase(database);
    const repository = new PantryRepository(database, uuidSequence());
    await assert.rejects(repository.create(pantryDraft({ name: ' ' })), /nombre/);
    await assert.rejects(repository.create(pantryDraft({ quantity: -1 })), /cantidad/);
    await assert.rejects(repository.create(pantryDraft({ purchaseDate: '2026-02-30' })), /no es válida/);
    await assert.rejects(repository.create(pantryDraft({ bestBeforeDate: '2026-11-01' })), /posterior/);
    assert.equal((await repository.list()).length, 0);
  } finally { sqlite.close(); }
});
