import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../database/migrations.ts';
import { RecipeRepository } from '../database/repositories/RecipeRepository.ts';
import { KitchenTimerRepository } from '../database/repositories/KitchenTimerRepository.ts';

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
  return () => `00000000-0000-4000-8000-${String(value++).padStart(12, '0')}`;
}

const draft = (overrides = {}) => ({
  userId: null,
  title: 'Sopa de prueba',
  description: 'Receta local',
  imageLocalUri: null,
  idealSeason: 'Invierno',
  category: 'Sopas',
  totalMinutes: 35,
  patienceLevel: 'Baja',
  baseServings: 4,
  grandmotherNotes: 'Probar y ajustar.',
  personalNotes: '',
  ingredients: [{ name: 'Calabaza', quantity: 400, unit: 'g', optional: false }],
  steps: [{ title: 'Cocinar', description: 'Hervir hasta que esté tierna.', timerMinutes: 20 }],
  ...overrides,
});

test('SQLite recipe lifecycle: create, edit, search, filters, favorites, delete', async () => {
  const { sqlite, database } = createDatabase();
  try {
    await migrateDatabase(database);
    const repository = new RecipeRepository(database, uuidSequence());

    const created = await repository.create(draft());
    assert.match(created.id, /^[0-9a-f-]{36}$/i);
    assert.equal(created.ingredients[0].quantity, 400);
    assert.equal(created.steps[0].timerMinutes, 20);

    const edited = await repository.update(created.id, draft({
      title: 'Sopa de calabaza',
      baseServings: 6,
      ingredients: [{ name: 'Calabaza', quantity: 600, unit: 'g', optional: true }],
      steps: [{ title: 'Asar', description: 'Asar la calabaza.', timerMinutes: 30 }],
    }));
    assert.equal(edited.title, 'Sopa de calabaza');
    assert.equal(edited.baseServings, 6);
    assert.equal(edited.ingredients[0].optional, true);
    assert.equal(edited.steps[0].title, 'Asar');
    await repository.updatePersonalNotes(created.id, 'Añadir pimienta al final');
    assert.equal((await repository.getById(created.id)).personalNotes, 'Añadir pimienta al final');

    const timerRepository = new KitchenTimerRepository(database);
    await timerRepository.save({
      id: edited.steps[0].id,
      recipeId: created.id,
      stepId: edited.steps[0].id,
      status: 'running',
      remainingMs: 60_000,
      targetEndAt: 1_800_000_000_000,
      notificationId: 'notification-demo',
      updatedAt: new Date().toISOString(),
    });
    const storedTimer = await timerRepository.getForStep(edited.steps[0].id);
    assert.equal(storedTimer.status, 'running');
    assert.equal(storedTimer.targetEndAt, 1_800_000_000_000);

    assert.equal((await repository.list({ search: 'CALABAZA' })).length, 1);
    assert.equal((await repository.list({ category: 'Sopas', season: 'Invierno', patienceLevel: 'Baja' })).length, 1);
    assert.equal((await repository.list({ search: 'sin coincidencia' })).length, 0);

    await repository.setFavorite(created.id, true);
    assert.equal((await repository.list({ favoritesOnly: true })).length, 1);
    await repository.setFavorite(created.id, false);
    assert.equal((await repository.list({ favoritesOnly: true })).length, 0);

    await repository.delete(created.id);
    assert.equal(await repository.getById(created.id), null);
    assert.equal((await repository.list()).length, 0);
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM recipe_ingredients').get().total, 0);
    assert.equal(sqlite.prepare('SELECT count(*) AS total FROM kitchen_timers').get().total, 0);
    await assert.rejects(repository.delete(created.id), /No se encontró la receta/);
  } finally {
    sqlite.close();
  }
});

test('invalid recipe data is rejected before SQLite writes', async () => {
  const { sqlite, database } = createDatabase();
  try {
    await migrateDatabase(database);
    const repository = new RecipeRepository(database, uuidSequence());
    await assert.rejects(repository.create(draft({ title: '  ' })), /título/);
    assert.equal((await repository.list()).length, 0);
  } finally { sqlite.close(); }
});
