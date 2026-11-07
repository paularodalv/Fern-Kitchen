import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  FermentationBatch, FermentationBatchInput, FermentationCustomField, FermentationCustomFieldInput,
  FermentationCustomFieldValue, FermentationEvent, FermentationEventInput, FermentationPhoto,
  FermentationPhotoInput, FermentationProject, FermentationProjectInput, FermentationReminder,
  FermentationReminderInput, FermentationStatus,
} from '../../types/fermentation';

type ProjectRow = Omit<FermentationProject, 'ingredients' | 'nextReminder' | 'latestEvent' | 'currentStage'> & {
  latestDescription: string | null; latestType: string | null; nextReminderId: string | null;
  nextReminderTitle: string | null; nextReminderDate: string | null;
};
type BatchRow = Omit<FermentationBatch, 'ingredients'>;
type EventRow = Omit<FermentationEvent, 'measurements' | 'ingredients'> & { measurementsJson: string; ingredientsJson: string };
type ReminderRow = Omit<FermentationReminder, 'isCompleted'> & { completedFlag: number };
type IngredientRow = { id: string; name: string; quantity: number | null; unit: string };

const projectSelect = `SELECT p.id, p.user_id AS userId, p.name, p.fermentation_type AS fermentationType,
  p.custom_type_name AS customTypeName, p.description, p.status, p.start_date AS startDate,
  p.expected_duration_days AS expectedDurationDays, p.temperature_notes AS temperatureNotes,
  p.initial_photo_uri AS initialPhotoUri, p.personal_notes AS personalNotes,
  p.created_at AS createdAt, p.updated_at AS updatedAt,
  (SELECT e.description FROM fermentation_events e WHERE e.project_id = p.id ORDER BY e.event_date DESC LIMIT 1) AS latestDescription,
  (SELECT e.event_type FROM fermentation_events e WHERE e.project_id = p.id ORDER BY e.event_date DESC LIMIT 1) AS latestType,
  (SELECT r.id FROM fermentation_reminders r WHERE r.project_id = p.id AND r.is_completed = 0 AND r.scheduled_at >= ? ORDER BY r.scheduled_at LIMIT 1) AS nextReminderId,
  (SELECT r.title FROM fermentation_reminders r WHERE r.project_id = p.id AND r.is_completed = 0 AND r.scheduled_at >= ? ORDER BY r.scheduled_at LIMIT 1) AS nextReminderTitle,
  (SELECT r.scheduled_at FROM fermentation_reminders r WHERE r.project_id = p.id AND r.is_completed = 0 AND r.scheduled_at >= ? ORDER BY r.scheduled_at LIMIT 1) AS nextReminderDate
  FROM fermentation_projects p`;

export class FermentationRepository {
  constructor(private readonly database: SQLiteDatabase, private readonly createUuid: () => string) {}

  async listProjects(): Promise<FermentationProject[]> {
    const now = new Date().toISOString();
    const rows = await this.database.getAllAsync<ProjectRow>(`${projectSelect} ORDER BY p.updated_at DESC;`, now, now, now);
    const projects: FermentationProject[] = [];
    for (const row of rows) projects.push(await this.hydrateProject(row));
    return projects;
  }

  async getProject(id: string): Promise<FermentationProject | null> {
    const now = new Date().toISOString();
    const row = await this.database.getFirstAsync<ProjectRow>(`${projectSelect} WHERE p.id = ? LIMIT 1;`, now, now, now, id);
    return row ? this.hydrateProject(row) : null;
  }

  async createProject(input: FermentationProjectInput): Promise<FermentationProject> {
    const fields = validateProject(input);
    const id = this.createUuid();
    const now = new Date().toISOString();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO fermentation_projects (id, user_id, name, fermentation_type, custom_type_name, description, status,
          start_date, expected_duration_days, temperature_notes, initial_photo_uri, personal_notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        id, fields.userId ?? null, fields.name, fields.fermentationType, fields.customTypeName, fields.description,
        fields.status, fields.startDate, fields.expectedDurationDays, fields.temperatureNotes,
        fields.initialPhotoUri, fields.personalNotes, now, now,
      );
      await this.replaceIngredients(id, null, fields.ingredients);
      if (fields.initialPhotoUri) await this.addPhoto({ projectId: id, batchId: null, eventId: null, localUri: fields.initialPhotoUri, caption: 'Foto inicial' });
    });
    await this.createEvent({ projectId: id, batchId: null, eventType: 'preparation', eventDate: now, description: 'Inicio del seguimiento', measurements: [], ingredients: fields.ingredients, notes: '' });
    const project = await this.getProject(id);
    if (!project) throw new Error('No se pudo recuperar el proyecto de fermentación.');
    return project;
  }

  async updateProject(id: string, input: FermentationProjectInput): Promise<FermentationProject> {
    const fields = validateProject(input);
    const now = new Date().toISOString();
    await this.database.withTransactionAsync(async () => {
      const result = await this.database.runAsync(
        `UPDATE fermentation_projects SET user_id = ?, name = ?, fermentation_type = ?, custom_type_name = ?, description = ?,
          status = ?, start_date = ?, expected_duration_days = ?, temperature_notes = ?, initial_photo_uri = ?, personal_notes = ?, updated_at = ?
         WHERE id = ?;`,
        fields.userId ?? null, fields.name, fields.fermentationType, fields.customTypeName, fields.description, fields.status,
        fields.startDate, fields.expectedDurationDays, fields.temperatureNotes, fields.initialPhotoUri, fields.personalNotes, now, id,
      );
      if (!result.changes) throw new Error('No se encontró el proyecto de fermentación.');
      await this.replaceIngredients(id, null, fields.ingredients);
    });
    const project = await this.getProject(id);
    if (!project) throw new Error('No se pudo recuperar el proyecto de fermentación.');
    return project;
  }

  async setProjectStatus(id: string, status: FermentationStatus): Promise<void> {
    assertStatus(status);
    const now = new Date().toISOString();
    const result = await this.database.runAsync('UPDATE fermentation_projects SET status = ?, updated_at = ? WHERE id = ?;', status, now, id);
    if (!result.changes) throw new Error('No se encontró el proyecto de fermentación.');
    const statusLabel = ({ planned: 'Planificado', active: 'Activo', observing: 'En observación', paused: 'Pausado', completed: 'Completado', discarded: 'Descartado' } as Record<FermentationStatus, string>)[status];
    await this.createEvent({ projectId: id, batchId: null, eventType: status === 'completed' ? 'completion' : 'status_change', eventDate: now, description: `Estado cambiado a ${statusLabel}`, measurements: [], ingredients: [], notes: '' });
  }

  async deleteProject(id: string): Promise<void> {
    const result = await this.database.runAsync('DELETE FROM fermentation_projects WHERE id = ?;', id);
    if (!result.changes) throw new Error('No se encontró el proyecto de fermentación.');
  }

  async listBatches(projectId: string): Promise<FermentationBatch[]> {
    const rows = await this.database.getAllAsync<BatchRow>('SELECT id, project_id AS projectId, name, start_date AS startDate, completion_date AS completionDate, status, notes, created_at AS createdAt, updated_at AS updatedAt FROM fermentation_batches WHERE project_id = ? ORDER BY start_date DESC;', projectId);
    const batches: FermentationBatch[] = [];
    for (const row of rows) batches.push({ ...row, ingredients: await this.listIngredients(projectId, row.id) });
    return batches;
  }

  async saveBatch(input: FermentationBatchInput, id?: string): Promise<FermentationBatch> {
    const fields = validateBatch(input);
    const now = new Date().toISOString();
    const batchId = id ?? this.createUuid();
    await this.database.withTransactionAsync(async () => {
      if (id) {
        const result = await this.database.runAsync('UPDATE fermentation_batches SET name = ?, start_date = ?, completion_date = ?, status = ?, notes = ?, updated_at = ? WHERE id = ? AND project_id = ?;', fields.name, fields.startDate, fields.completionDate, fields.status, fields.notes, now, id, fields.projectId);
        if (!result.changes) throw new Error('No se encontró el lote.');
      } else {
        await this.database.runAsync('INSERT INTO fermentation_batches (id, project_id, name, start_date, completion_date, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);', batchId, fields.projectId, fields.name, fields.startDate, fields.completionDate, fields.status, fields.notes, now, now);
      }
      await this.replaceIngredients(fields.projectId, batchId, fields.ingredients);
    });
    const batch = (await this.listBatches(fields.projectId)).find((item) => item.id === batchId);
    if (!batch) throw new Error('No se pudo recuperar el lote.');
    return batch;
  }

  async deleteBatch(id: string): Promise<void> {
    const result = await this.database.runAsync('DELETE FROM fermentation_batches WHERE id = ?;', id);
    if (!result.changes) throw new Error('No se encontró el lote.');
  }

  async setBatchStatus(id: string, status: FermentationStatus): Promise<void> {
    assertStatus(status);
    const batch = await this.database.getFirstAsync<{ projectId: string }>('SELECT project_id AS projectId FROM fermentation_batches WHERE id = ?;', id);
    if (!batch) throw new Error('No se encontró el lote.');
    const now = new Date().toISOString();
    await this.database.runAsync('UPDATE fermentation_batches SET status = ?, completion_date = ?, updated_at = ? WHERE id = ?;', status, status === 'completed' ? now.slice(0, 10) : null, now, id);
    const statusLabel = ({ planned: 'Planificado', active: 'Activo', observing: 'En observación', paused: 'Pausado', completed: 'Completado', discarded: 'Descartado' } as Record<FermentationStatus, string>)[status];
    await this.createEvent({ projectId: batch.projectId, batchId: id, eventType: status === 'completed' ? 'completion' : 'status_change', eventDate: now, description: `Lote · ${statusLabel}`, measurements: [], ingredients: [], notes: '' });
  }

  async createEvent(input: FermentationEventInput): Promise<FermentationEvent> {
    const fields = validateEvent(input);
    const id = this.createUuid();
    const createdAt = new Date().toISOString();
    await this.database.runAsync('INSERT INTO fermentation_events (id, project_id, batch_id, event_type, event_date, description, measurements_json, ingredients_json, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);', id, fields.projectId, fields.batchId, fields.eventType, fields.eventDate, fields.description, JSON.stringify(fields.measurements), JSON.stringify(fields.ingredients), fields.notes, createdAt);
    await this.database.runAsync('UPDATE fermentation_projects SET updated_at = ? WHERE id = ?;', createdAt, fields.projectId);
    return { ...fields, id, createdAt };
  }

  async listEvents(projectId: string, batchId?: string | null): Promise<FermentationEvent[]> {
    const rows = await this.database.getAllAsync<EventRow>(
      `SELECT id, project_id AS projectId, batch_id AS batchId, event_type AS eventType, event_date AS eventDate, description,
       measurements_json AS measurementsJson, ingredients_json AS ingredientsJson, notes, created_at AS createdAt
       FROM fermentation_events WHERE project_id = ? ${batchId ? 'AND batch_id = ?' : ''} ORDER BY event_date DESC, created_at DESC;`,
      ...(batchId ? [projectId, batchId] : [projectId]),
    );
    return rows.map((row) => ({ ...row, measurements: parseJson(row.measurementsJson), ingredients: parseJson(row.ingredientsJson) }));
  }

  async listReminders(projectId?: string, onlyUpcoming = false): Promise<FermentationReminder[]> {
    const rows = await this.database.getAllAsync<ReminderRow>(
      `SELECT id, project_id AS projectId, batch_id AS batchId, title, task_type AS taskType, scheduled_at AS scheduledAt,
       notification_id AS notificationId, is_completed AS completedFlag, completed_at AS completedAt, created_at AS createdAt, updated_at AS updatedAt
       FROM fermentation_reminders WHERE (? IS NULL OR project_id = ?) AND (? = 0 OR (is_completed = 0 AND scheduled_at >= ?)) ORDER BY scheduled_at ASC;`,
      projectId ?? null, projectId ?? null, onlyUpcoming ? 1 : 0, new Date().toISOString(),
    );
    return rows.map(({ completedFlag, ...row }) => ({ ...row, isCompleted: completedFlag === 1 }));
  }

  async saveReminder(input: FermentationReminderInput, notificationId: string | null, id?: string): Promise<FermentationReminder> {
    const fields = validateReminder(input);
    const now = new Date().toISOString();
    const reminderId = id ?? this.createUuid();
    if (id) {
      const result = await this.database.runAsync('UPDATE fermentation_reminders SET batch_id = ?, title = ?, task_type = ?, scheduled_at = ?, notification_id = ?, is_completed = 0, completed_at = NULL, updated_at = ? WHERE id = ?;', fields.batchId, fields.title, fields.taskType, fields.scheduledAt, notificationId, now, id);
      if (!result.changes) throw new Error('No se encontró el recordatorio.');
    } else {
      await this.database.runAsync('INSERT INTO fermentation_reminders (id, project_id, batch_id, title, task_type, scheduled_at, notification_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);', reminderId, fields.projectId, fields.batchId, fields.title, fields.taskType, fields.scheduledAt, notificationId, now, now);
    }
    const reminder = (await this.listReminders(fields.projectId)).find((item) => item.id === reminderId);
    if (!reminder) throw new Error('No se pudo recuperar el recordatorio.');
    return reminder;
  }

  async setReminderCompleted(id: string, completed: boolean): Promise<void> {
    const now = new Date().toISOString();
    const result = await this.database.runAsync('UPDATE fermentation_reminders SET is_completed = ?, completed_at = ?, updated_at = ? WHERE id = ?;', completed ? 1 : 0, completed ? now : null, now, id);
    if (!result.changes) throw new Error('No se encontró el recordatorio.');
  }

  async deleteReminder(id: string): Promise<void> {
    const result = await this.database.runAsync('DELETE FROM fermentation_reminders WHERE id = ?;', id);
    if (!result.changes) throw new Error('No se encontró el recordatorio.');
  }

  async addPhoto(input: FermentationPhotoInput): Promise<FermentationPhoto> {
    const fields = { ...input, localUri: input.localUri.trim(), caption: input.caption.trim() };
    if (!/^(file|content|asset):\/\//i.test(fields.localUri) && !/^assets[\\/]/i.test(fields.localUri)) throw new RangeError('Selecciona una foto almacenada localmente.');
    const id = this.createUuid();
    const createdAt = new Date().toISOString();
    await this.database.runAsync('INSERT INTO fermentation_photos (id, project_id, batch_id, event_id, local_uri, caption, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);', id, fields.projectId, fields.batchId, fields.eventId, fields.localUri, fields.caption, createdAt);
    return { ...fields, id, createdAt };
  }

  async listPhotos(projectId: string, batchId?: string | null): Promise<FermentationPhoto[]> {
    const rows = await this.database.getAllAsync<FermentationPhoto>(
      `SELECT id, project_id AS projectId, batch_id AS batchId, event_id AS eventId, local_uri AS localUri, caption, created_at AS createdAt FROM fermentation_photos WHERE project_id = ? ${batchId ? 'AND batch_id = ?' : ''} ORDER BY created_at DESC;`,
      ...(batchId ? [projectId, batchId] : [projectId]),
    );
    return rows;
  }

  async createCustomField(input: FermentationCustomFieldInput): Promise<FermentationCustomField> {
    const name = input.name.trim();
    if (!name) throw new RangeError('Escribe un nombre para el campo.');
    const id = this.createUuid();
    const createdAt = new Date().toISOString();
    await this.database.runAsync('INSERT INTO fermentation_custom_fields (id, project_id, batch_id, name, field_type, unit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);', id, input.projectId, input.batchId, name, input.fieldType, input.unit.trim(), createdAt);
    return { ...input, name, unit: input.unit.trim(), id, createdAt };
  }

  async listCustomFields(projectId: string, batchId?: string | null): Promise<FermentationCustomField[]> {
    return this.database.getAllAsync<FermentationCustomField>(`SELECT id, project_id AS projectId, batch_id AS batchId, name, field_type AS fieldType, unit, created_at AS createdAt FROM fermentation_custom_fields WHERE project_id = ? ${batchId ? 'AND batch_id = ?' : 'AND batch_id IS NULL'} ORDER BY created_at;`, ...(batchId ? [projectId, batchId] : [projectId]));
  }

  async deleteCustomField(id: string): Promise<void> {
    const result = await this.database.runAsync('DELETE FROM fermentation_custom_fields WHERE id = ?;', id);
    if (!result.changes) throw new Error('No se encontró el campo personalizado.');
  }

  async saveCustomFieldValue(fieldId: string, eventId: string, value: string, recordedAt: string): Promise<FermentationCustomFieldValue> {
    if (!value.trim()) throw new RangeError('Añade un valor para el campo.');
    const field = await this.database.getFirstAsync<{ fieldType: string }>('SELECT field_type AS fieldType FROM fermentation_custom_fields WHERE id = ?;', fieldId);
    if (!field) throw new Error('No se encontró el campo personalizado.');
    if (field.fieldType === 'number' && !Number.isFinite(Number(value))) throw new RangeError('Escribe un valor numérico válido.');
    if (field.fieldType === 'date' && !isCalendarDate(value)) throw new RangeError('Usa una fecha válida con formato AAAA-MM-DD.');
    if (field.fieldType === 'boolean' && !['true', 'false', 'sí', 'no'].includes(value.toLocaleLowerCase('es-ES'))) throw new RangeError('Escribe sí o no.');
    const id = this.createUuid();
    const createdAt = new Date().toISOString();
    await this.database.runAsync('INSERT INTO fermentation_custom_field_values (id, field_id, event_id, value_text, recorded_at, created_at) VALUES (?, ?, ?, ?, ?, ?);', id, fieldId, eventId, value.trim(), recordedAt, createdAt);
    return { id, fieldId, eventId, value: value.trim(), recordedAt, createdAt };
  }

  async listCustomFieldHistory(fieldId: string): Promise<FermentationCustomFieldValue[]> {
    const rows = await this.database.getAllAsync<{ id: string; fieldId: string; eventId: string; value: string; recordedAt: string; createdAt: string }>('SELECT id, field_id AS fieldId, event_id AS eventId, value_text AS value, recorded_at AS recordedAt, created_at AS createdAt FROM fermentation_custom_field_values WHERE field_id = ? ORDER BY recorded_at DESC;', fieldId);
    return rows;
  }

  private async hydrateProject(row: ProjectRow): Promise<FermentationProject> {
    const { latestDescription, latestType, nextReminderId, nextReminderTitle, nextReminderDate, ...project } = row;
    const nextReminder = nextReminderId && nextReminderTitle && nextReminderDate
      ? (await this.listReminders(project.id)).find((item) => item.id === nextReminderId) ?? null
      : null;
    const stageLabels: Record<string, string> = { preparation: 'Preparación', feeding: 'Alimentación', measurement: 'Medición', observation: 'Observación', status_change: 'Cambio de estado', completion: 'Completado', note: 'Nota' };
    return {
      ...project,
      ingredients: await this.listIngredients(project.id, null),
      currentStage: latestType ? stageLabels[latestType] ?? 'Actividad reciente' : latestDescription,
      nextReminder,
      latestEvent: (await this.listEvents(project.id))[0] ?? null,
    };
  }

  private async listIngredients(projectId: string, batchId: string | null): Promise<IngredientRow[]> {
    return this.database.getAllAsync<IngredientRow>(`SELECT id, name, quantity, unit FROM fermentation_ingredients WHERE project_id = ? AND ${batchId ? 'batch_id = ?' : 'batch_id IS NULL'} ORDER BY rowid;`, ...(batchId ? [projectId, batchId] : [projectId]));
  }

  private async replaceIngredients(projectId: string, batchId: string | null, ingredients: FermentationProjectInput['ingredients']): Promise<void> {
    await this.database.runAsync(`DELETE FROM fermentation_ingredients WHERE project_id = ? AND ${batchId ? 'batch_id = ?' : 'batch_id IS NULL'};`, ...(batchId ? [projectId, batchId] : [projectId]));
    for (const ingredient of ingredients) {
      await this.database.runAsync('INSERT INTO fermentation_ingredients (id, project_id, batch_id, name, quantity, unit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);', this.createUuid(), projectId, batchId, ingredient.name, ingredient.quantity, ingredient.unit, new Date().toISOString());
    }
  }
}

function validateProject(input: FermentationProjectInput): FermentationProjectInput {
  if (!input.name.trim()) throw new RangeError('Escribe un nombre para el proyecto.');
  if (input.fermentationType === 'custom' && !input.customTypeName?.trim()) throw new RangeError('Escribe el nombre del tipo de fermento personalizado.');
  if (input.initialPhotoUri && !/^(file|content|asset):\/\//i.test(input.initialPhotoUri) && !/^assets[\\/]/i.test(input.initialPhotoUri)) throw new RangeError('La foto debe estar guardada localmente.');
  assertDate(input.startDate);
  assertStatus(input.status);
  if (input.expectedDurationDays !== null && (!Number.isInteger(input.expectedDurationDays) || input.expectedDurationDays <= 0)) throw new RangeError('La duración debe ser un número de días positivo.');
  return { ...input, name: input.name.trim(), customTypeName: input.customTypeName?.trim() || null, description: input.description.trim(), personalNotes: input.personalNotes.trim(), ingredients: input.ingredients.map(validateIngredient) };
}

function validateBatch(input: FermentationBatchInput): FermentationBatchInput {
  if (!input.name.trim()) throw new RangeError('Escribe un nombre para el lote.');
  assertDate(input.startDate);
  if (input.completionDate) assertDate(input.completionDate);
  assertStatus(input.status);
  return { ...input, name: input.name.trim(), ingredients: input.ingredients.map(validateIngredient) };
}

function validateEvent(input: FermentationEventInput): FermentationEventInput {
  assertDateTime(input.eventDate);
  if (!input.description.trim() && !input.notes.trim() && !input.measurements.length && !input.ingredients.length) throw new RangeError('Añade una observación, medida o ingrediente antes de guardar.');
  for (const measurement of input.measurements) if (!measurement.name.trim() || !Number.isFinite(measurement.value)) throw new RangeError('Revisa las medidas registradas.');
  return { ...input, description: input.description.trim(), notes: input.notes.trim(), measurements: input.measurements.map((item) => ({ ...item, name: item.name.trim(), unit: item.unit.trim() })), ingredients: input.ingredients.map(validateIngredient) };
}

function validateReminder(input: FermentationReminderInput): FermentationReminderInput {
  if (!input.title.trim()) throw new RangeError('Escribe un título para el recordatorio.');
  assertDateTime(input.scheduledAt);
  if (new Date(input.scheduledAt).getTime() <= Date.now()) throw new RangeError('Elige una fecha y hora futura.');
  return { ...input, title: input.title.trim() };
}

function validateIngredient(input: FermentationIngredientInput): FermentationIngredientInput {
  if (!input.name.trim()) throw new RangeError('Escribe el nombre de cada ingrediente.');
  if (input.quantity !== null && (!Number.isFinite(input.quantity) || input.quantity < 0)) throw new RangeError('La cantidad debe ser cero o mayor.');
  return { ...input, name: input.name.trim(), unit: input.unit.trim() };
}

type FermentationIngredientInput = FermentationProjectInput['ingredients'][number];

function assertStatus(status: FermentationStatus): void {
  if (!['planned', 'active', 'observing', 'paused', 'completed', 'discarded'].includes(status)) throw new RangeError('El estado del fermento no es válido.');
}

function assertDate(value: string): void {
  if (!isCalendarDate(value)) throw new RangeError('La fecha no es válida.');
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function assertDateTime(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) throw new RangeError('La fecha y hora no son válidas.');
}

function parseJson<T>(value: string): T {
  try { return JSON.parse(value) as T; } catch { return [] as T; }
}
