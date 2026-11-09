import type { FernKitchenBackup } from '../../types/backup';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateBackup(value: unknown): FernKitchenBackup {
  if (!isRecord(value) || value.format !== 'fern-kitchen-backup' || value.backupVersion !== 1) {
    throw new Error('El archivo no es una copia de seguridad compatible de Fern Kitchen.');
  }
  if (!Number.isInteger(value.schemaVersion) || (value.schemaVersion as number) > 11 || (value.schemaVersion as number) < 1) {
    throw new Error('La versión de la base de datos de la copia no es compatible.');
  }
  if (!isRecord(value.data) || !Array.isArray(value.data.recipes) || !Array.isArray(value.data.pantryItems)) {
    throw new Error('La copia está incompleta o tiene un formato incorrecto.');
  }
  const recipeIds = new Set<string>();
  for (const recipe of value.data.recipes) {
    if (!isRecord(recipe) || !isUuid(recipe.id) || recipeIds.has(recipe.id)) throw new Error('La copia contiene una receta con identificador inválido o repetido.');
    recipeIds.add(recipe.id);
    if (typeof recipe.title !== 'string' || !recipe.title.trim() || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.steps)) {
      throw new Error('La copia contiene una receta incompleta.');
    }
    for (const child of [...recipe.ingredients, ...recipe.steps]) {
      if (!isRecord(child) || !isUuid(child.id)) throw new Error('La copia contiene ingredientes o pasos con identificadores inválidos.');
    }
  }
  const pantryIds = new Set<string>();
  for (const item of value.data.pantryItems) {
    if (!isRecord(item) || !isUuid(item.id) || pantryIds.has(item.id) || typeof item.name !== 'string' || !item.name.trim()) {
      throw new Error('La copia contiene un ingrediente de alacena inválido o repetido.');
    }
    pantryIds.add(item.id);
    if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || typeof item.unit !== 'string' || typeof item.category !== 'string') {
      throw new Error('La copia contiene cantidades o datos de alacena inválidos.');
    }
  }
  if (value.mediaIncluded !== false) throw new Error('La copia debe tener el formato de Fern Kitchen sin archivos multimedia.');
  return value as unknown as FernKitchenBackup;
}

function isUuid(value: unknown): value is string { return typeof value === 'string' && uuidPattern.test(value); }
function isRecord(value: unknown): value is Record<string, any> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
