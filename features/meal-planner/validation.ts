import type { MealPlanEntryFields, MealType } from '../../types/meal-planner';

export class MealPlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MealPlanValidationError';
  }
}

export class MealSlotConflictError extends Error {
  constructor(date: string, mealType: MealType) {
    super(`Ya hay una comida planificada para ${date} en ese momento del día.`);
    this.name = 'MealSlotConflictError';
    this.date = date;
    this.mealType = mealType;
  }

  readonly date: string;
  readonly mealType: MealType;
}

export class MealPlanEntryNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el plan de comida ${id}.`);
    this.name = 'MealPlanEntryNotFoundError';
  }
}

export function validateMealPlanEntry(input: MealPlanEntryFields): MealPlanEntryFields {
  if (!isValidDate(input.date)) throw new MealPlanValidationError('Elige una fecha válida.');
  if (!['breakfast', 'lunch', 'snack', 'dinner'].includes(input.mealType)) throw new MealPlanValidationError('Elige un momento del día válido.');
  if (!Number.isInteger(input.servings) || input.servings < 1 || input.servings > 100) throw new MealPlanValidationError('Las raciones deben estar entre 1 y 100.');
  if (input.notes.trim().length > 2000) throw new MealPlanValidationError('Las notas no pueden superar los 2.000 caracteres.');

  const customMealName = input.customMealName?.trim() || null;
  const customMealDescription = input.customMealDescription?.trim() || null;
  if (input.entryKind === 'recipe') {
    if (!input.recipeId) throw new MealPlanValidationError('Selecciona una receta.');
    if (customMealName || customMealDescription) throw new MealPlanValidationError('Una receta vinculada no puede guardar una copia de sus datos.');
  } else if (input.entryKind === 'custom') {
    if (input.recipeId) throw new MealPlanValidationError('Una comida libre no puede vincular una receta.');
    if (!customMealName) throw new MealPlanValidationError('Escribe el nombre de la comida.');
    if (customMealName.length > 120) throw new MealPlanValidationError('El nombre no puede superar 120 caracteres.');
    if ((customMealDescription?.length ?? 0) > 1000) throw new MealPlanValidationError('La descripción no puede superar 1.000 caracteres.');
  } else {
    throw new MealPlanValidationError('Elige una receta o una comida libre.');
  }

  return {
    ...input,
    date: input.date,
    notes: input.notes.trim(),
    customMealName: input.entryKind === 'custom' ? customMealName : null,
    customMealDescription: input.entryKind === 'custom' ? customMealDescription : null,
    recipeId: input.entryKind === 'recipe' ? input.recipeId : null,
  };
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
