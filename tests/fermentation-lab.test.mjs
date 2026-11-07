import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrateDatabase } from '../database/migrations.ts';
import { FermentationRepository } from '../database/repositories/FermentationRepository.ts';
import { calculateBrineSalt, calculateHydration, calculateSourdoughFeeding, convertWeight } from '../features/fermentation/calculators.ts';
import { LocalNotificationService } from '../services/LocalNotificationService.ts';

function createDatabase(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
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
  return () => `30000000-0000-4000-8000-${String(value++).padStart(12, '0')}`;
}

const projectDraft = (overrides = {}) => ({
  userId: null, name: 'Masa madre del centeno', fermentationType: 'sourdough', customTypeName: null,
  description: 'Primer cultivo', status: 'active', startDate: '2026-11-07', expectedDurationDays: null,
  temperatureNotes: 'Cocina fresca', initialPhotoUri: 'file:///private/fermento-inicial.jpg', personalNotes: 'Huele suave',
  ingredients: [{ name: 'Harina de centeno', quantity: 100, unit: 'g' }, { name: 'Agua', quantity: 100, unit: 'g' }],
  ...overrides,
});

test('fermentation calculators use explicit ratios, units and reject invalid amounts', () => {
  assert.deepEqual(calculateSourdoughFeeding(50, 2, 2), { starter: 50, flour: 100, water: 100, total: 250 });
  assert.equal(calculateSourdoughFeeding(50, 1, 1).total, 150);
  assert.equal(calculateHydration(500, 350), 70);
  assert.equal(calculateBrineSalt(1000, 2.5), 25);
  assert.equal(convertWeight(1.25, 'kg', 'g'), 1250);
  assert.equal(convertWeight(2500, 'g', 'kg'), 2.5);
  assert.throws(() => calculateSourdoughFeeding(0, 1, 1), /masa madre/);
  assert.throws(() => calculateSourdoughFeeding(50, -1, 1), /harina/);
  assert.throws(() => calculateHydration(0, 10), /harina/);
  assert.throws(() => calculateBrineSalt(500, 101), /100/);
  assert.throws(() => calculateBrineSalt(0, 2), /mayor que cero/);
  assert.throws(() => convertWeight(-1, 'g', 'kg'), /negativo/);
});

test('project create, edit, status, measurements, custom field history and batch management persist across reopening SQLite', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'fern-fermentation-'));
  const filename = join(directory, 'laboratory.sqlite');
  let { sqlite, database } = createDatabase(filename);
  try {
    await migrateDatabase(database);
    const repository = new FermentationRepository(database, uuidSequence());
    const project = await repository.createProject(projectDraft());
    assert.match(project.id, /^[0-9a-f-]{36}$/i);
    assert.equal(project.ingredients.length, 2);
    assert.equal((await repository.listPhotos(project.id))[0].caption, 'Foto inicial');
    const edited = await repository.updateProject(project.id, projectDraft({ name: 'Masa madre de centeno y espelta', description: 'Actualizada', ingredients: [{ name: 'Harina', quantity: 200, unit: 'g' }] }));
    assert.equal(edited.name, 'Masa madre de centeno y espelta');
    assert.equal(edited.ingredients[0].quantity, 200);
    await assert.rejects(repository.updateProject(project.id, projectDraft({ name: ' ' })), /nombre/);

    const field = await repository.createCustomField({ projectId: project.id, batchId: null, name: 'Aumento de volumen', fieldType: 'measurement', unit: '%' });
    const measurementEvent = await repository.createEvent({
      projectId: project.id, batchId: null, eventType: 'measurement', eventDate: new Date().toISOString(),
      description: 'Primera observación', measurements: [{ name: 'Temperatura', value: 21, unit: '°C' }],
      ingredients: [], notes: 'Burbujeo visible',
    });
    assert.equal((await repository.listEvents(project.id))[0].measurements[0].value, 21);
    await repository.saveCustomFieldValue(field.id, measurementEvent.id, '35', measurementEvent.eventDate);
    assert.equal((await repository.listCustomFieldHistory(field.id))[0].value, '35');
    await assert.rejects(repository.saveCustomFieldValue(field.id, measurementEvent.id, ' ', measurementEvent.eventDate), /valor/);
    const numericField = await repository.createCustomField({ projectId: project.id, batchId: null, name: 'pH', fieldType: 'number', unit: '' });
    await assert.rejects(repository.saveCustomFieldValue(numericField.id, measurementEvent.id, 'no', measurementEvent.eventDate), /numérico/);

    const firstBatch = await repository.saveBatch({ projectId: project.id, name: 'Tarro uno', startDate: '2026-11-07', completionDate: null, status: 'active', notes: 'Lote independiente', ingredients: [{ name: 'Harina', quantity: 100, unit: 'g' }] });
    const secondBatch = await repository.saveBatch({ projectId: project.id, name: 'Tarro dos', startDate: '2026-11-08', completionDate: null, status: 'observing', notes: '', ingredients: [] });
    assert.equal((await repository.listBatches(project.id)).length, 2);
    assert.equal(firstBatch.ingredients[0].name, 'Harina');
    const batchField = await repository.createCustomField({ projectId: project.id, batchId: firstBatch.id, name: 'Salmuera', fieldType: 'measurement', unit: '%' });
    assert.equal((await repository.listCustomFields(project.id, firstBatch.id))[0].id, batchField.id);
    assert.equal((await repository.listCustomFields(project.id)).some((item) => item.id === batchField.id), false);
    await repository.setBatchStatus(secondBatch.id, 'paused');
    assert.equal((await repository.listBatches(project.id)).find((batch) => batch.id === secondBatch.id).status, 'paused');
    const batchEvent = await repository.createEvent({ projectId: project.id, batchId: firstBatch.id, eventType: 'observation', eventDate: new Date().toISOString(), description: 'Cambio de aspecto', measurements: [], ingredients: [], notes: '' });
    assert.equal((await repository.listEvents(project.id, firstBatch.id))[0].id, batchEvent.id);

    await repository.setProjectStatus(project.id, 'paused');
    assert.equal((await repository.getProject(project.id)).status, 'paused');
    assert.equal((await repository.listEvents(project.id)).some((event) => event.description.includes('Pausado')), true);
    const reminderDate = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const savedReminder = await repository.saveReminder({ projectId: project.id, batchId: null, title: 'Revisar mañana', taskType: 'check', scheduledAt: reminderDate }, 'local-id-for-restart-test');
    sqlite.close();
    ({ sqlite, database } = createDatabase(filename));
    await migrateDatabase(database);
    const reopened = new FermentationRepository(database, uuidSequence());
    const stored = await reopened.getProject(project.id);
    assert.equal(stored.name, 'Masa madre de centeno y espelta');
    assert.equal((await reopened.listEvents(project.id)).length, 5);
    assert.equal((await reopened.listBatches(project.id)).length, 2);
    assert.equal((await reopened.listCustomFieldHistory(field.id))[0].value, '35');
    assert.equal((await reopened.listReminders(project.id))[0].id, savedReminder.id);
    assert.equal((await reopened.listReminders(project.id))[0].notificationId, 'local-id-for-restart-test');
    await reopened.deleteBatch(firstBatch.id);
    assert.equal((await reopened.listEvents(project.id, firstBatch.id)).length, 0);
    await reopened.deleteBatch(secondBatch.id);
    assert.equal((await reopened.listBatches(project.id)).length, 0);
  } finally { if (sqlite.isOpen) sqlite.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('reminders store notification identifiers, support completion, edit and removal with local cancellation', async () => {
  const { sqlite, database } = createDatabase();
  try {
    await migrateDatabase(database);
    const repository = new FermentationRepository(database, uuidSequence());
    const project = await repository.createProject(projectDraft());
    const cancelled = [];
    let scheduled = 0;
    const service = new LocalNotificationService({
      requestPermission: async () => true,
      schedule: async () => `notification-${++scheduled}`,
      cancel: async (id) => { cancelled.push(id); },
    });
    const scheduleDate = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();
    const firstId = await service.schedule({ title: 'Alimentar masa madre', body: project.name, scheduledAt: new Date(scheduleDate(40)) });
    const first = await repository.saveReminder({ projectId: project.id, batchId: null, title: 'Alimentar masa madre', taskType: 'feeding', scheduledAt: scheduleDate(40) }, firstId);
    assert.equal(first.notificationId, 'notification-1');
    await service.cancel(first.notificationId);
    const changedId = await service.schedule({ title: 'Revisar el cultivo', body: project.name, scheduledAt: new Date(scheduleDate(80)) });
    const updated = await repository.saveReminder({ projectId: project.id, batchId: null, title: 'Revisar el cultivo', taskType: 'check', scheduledAt: scheduleDate(80) }, changedId, first.id);
    assert.equal(updated.title, 'Revisar el cultivo');
    assert.deepEqual(cancelled, ['notification-1']);
    await repository.setReminderCompleted(updated.id, true);
    assert.equal((await repository.listReminders(project.id))[0].isCompleted, true);
    await service.cancel(updated.notificationId);
    await repository.deleteReminder(updated.id);
    assert.equal((await repository.listReminders(project.id)).length, 0);
    const noPermission = new LocalNotificationService({ requestPermission: async () => false, schedule: async () => 'unreachable', cancel: async () => {} });
    assert.equal(await noPermission.schedule({ title: 'Tarea', body: 'Cultivo', scheduledAt: new Date(scheduleDate(20)) }), null);
    await assert.rejects(service.schedule({ title: 'Tarea', body: '', scheduledAt: new Date(Date.now() - 1) }), /futura/);
  } finally { sqlite.close(); }
});
