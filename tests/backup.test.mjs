import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../database/migrations.ts';
import { BackupRepository } from '../database/repositories/BackupRepository.ts';
import { validateBackup } from '../features/backup/validateBackup.ts';

function createDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  const database = {
    execAsync: async (sql) => sqlite.exec(sql),
    runAsync: async (sql, ...params) => { const result = sqlite.prepare(sql).run(...params); return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) }; },
    getAllAsync: async (sql, ...params) => sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params) ?? null,
    withTransactionAsync: async (callback) => { sqlite.exec('BEGIN'); try { await callback(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
  };
  return { sqlite, database };
}

const source = {
  format: 'fern-kitchen-backup', backupVersion: 1, schemaVersion: 10, exportedAt: '2026-11-09T10:00:00.000Z', mediaIncluded: false,
  data: {
    recipes: [{ id: '10000000-0000-4000-8000-000000000001', userId: null, ownerUserId: null, visibility: 'private', title: 'Pan de prueba',
      description: '', imageLocalUri: null, idealSeason: 'Todo el año', category: 'Pan', totalMinutes: 20, patienceLevel: 'Baja', baseServings: 1,
      grandmotherNotes: '', personalNotes: 'nota', createdAt: '2026-11-09T10:00:00.000Z', updatedAt: '2026-11-09T10:00:00.000Z', isFavorite: true,
      ingredients: [{ id: '10000000-0000-4000-8000-000000000002', name: 'Harina', quantity: 100, unit: 'g', optional: false, createdAt: '2026-11-09T10:00:00.000Z', updatedAt: '2026-11-09T10:00:00.000Z' }],
      steps: [{ id: '10000000-0000-4000-8000-000000000003', number: 1, title: 'Mezclar', description: 'Mezclar bien.', timerMinutes: null, createdAt: '2026-11-09T10:00:00.000Z', updatedAt: '2026-11-09T10:00:00.000Z' }] }],
    pantryItems: [{ id: '10000000-0000-4000-8000-000000000004', userId: null, ownerUserId: null, name: 'Harina', normalizedName: 'harina', quantity: 1,
      unit: 'kg', purchaseDate: null, bestBeforeDate: null, category: 'Despensa', notes: '', imageLocalUri: null, createdAt: '2026-11-09T10:00:00.000Z', updatedAt: '2026-11-09T10:00:00.000Z' }],
  },
};

test('backup import validates, persists recipes and pantry, then skips UUID duplicates', async () => {
  const { sqlite, database } = createDatabase();
  try {
    await migrateDatabase(database);
    const repository = new BackupRepository(database);
    const backup = validateBackup(source);
    assert.deepEqual(await repository.importData(backup), { recipesAdded: 1, pantryItemsAdded: 1, duplicatesSkipped: 0 });
    assert.deepEqual(await repository.importData(backup), { recipesAdded: 0, pantryItemsAdded: 0, duplicatesSkipped: 2 });
    const exported = await repository.exportData();
    assert.equal(exported.data.recipes[0].isFavorite, true);
    assert.equal(exported.data.recipes[0].personalNotes, 'nota');
    assert.equal(exported.data.pantryItems[0].name, 'Harina');
    assert.equal(exported.data.recipes[0].imageLocalUri, null);
  } finally { sqlite.close(); }
});

test('invalid backup is rejected and transaction failures roll back every inserted table', async () => {
  assert.throws(() => validateBackup({ ...source, backupVersion: 99 }), /no es una copia/);
  const invalid = structuredClone(source); invalid.data.recipes[0].id = 'not-a-uuid';
  assert.throws(() => validateBackup(invalid), /identificador inválido/);
  const { sqlite, database } = createDatabase();
  try {
    await migrateDatabase(database);
    const brokenDatabase = { ...database, runAsync: async (sql, ...params) => {
      if (sql.includes('INSERT INTO pantry_items')) throw new Error('simulated disk failure');
      return database.runAsync(sql, ...params);
    } };
    await assert.rejects(new BackupRepository(brokenDatabase).importData(validateBackup(source)), /simulated disk failure/);
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM recipes').get().total, 0);
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM pantry_items').get().total, 0);
  } finally { sqlite.close(); }
});
