import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../database/migrations.ts';
import { ImageRepository } from '../database/repositories/ImageRepository.ts';

function makeDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  const database = {
    execAsync: async (sql) => sqlite.exec(sql),
    runAsync: async (sql, ...params) => {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getAllAsync: async (sql, ...params) => sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params) ?? null,
    withTransactionAsync: async (callback) => { sqlite.exec('BEGIN'); try { await callback(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
  };
  return { sqlite, database };
}

function createUuid() { let next = 1; return () => `00000000-0000-4000-8000-${String(next++).padStart(12, '0')}`; }

test('central image records persist and can be associated with multiple local entities', async () => {
  const { sqlite, database } = makeDatabase();
  try {
    await migrateDatabase(database);
    const repository = new ImageRepository(database, createUuid());
    await repository.register({ id: '00000000-0000-4000-8000-000000000100', localUri: 'file:///documents/images/recipe/photo.jpg', originalFilename: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 1234, width: 800, height: 600, category: 'recipe' });
    const image = await repository.getByUri('file:///documents/images/recipe/photo.jpg');
    assert.equal(image?.fileSize, 1234);
    assert.equal(image?.width, 800);
    await repository.associate(image.id, 'recipe', 'recipe-a', 'cover');
    await repository.associate(image.id, 'recipe', 'recipe-b', 'gallery', 0);
    assert.equal((await repository.listForEntity('recipe', 'recipe-a', 'cover'))[0].id, image.id);
    assert.equal((await repository.listForEntity('recipe', 'recipe-b', 'gallery'))[0].id, image.id);
    assert.equal(await repository.isReferenced(image.id), true);
    assert.equal(await repository.removeRecordIfUnused(image.id), false);
    await repository.clearAssociations('recipe', 'recipe-a', 'cover');
    assert.equal((await repository.listForEntity('recipe', 'recipe-a', 'cover')).length, 0);
    assert.equal(await repository.isReferenced(image.id), true);
    await repository.clearAssociations('recipe', 'recipe-b', 'gallery');
    assert.equal((await repository.listUnused()).length, 1);
    assert.equal((await repository.getById(image.id)).localUri, image.localUri);
  } finally { sqlite.close(); }
});

test('image associations require a valid central image record', async () => {
  const { sqlite, database } = makeDatabase();
  try {
    await migrateDatabase(database);
    const repository = new ImageRepository(database, createUuid());
    await assert.rejects(repository.associate('missing-image', 'recipe', 'recipe-a', 'cover'));
  } finally { sqlite.close(); }
});
