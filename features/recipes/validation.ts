import type { PatienceLevel, RecipeFields, RecipeSeason, RecipeValidationIssue } from '../../types/recipe';

const seasons: RecipeSeason[] = ['Primavera', 'Verano', 'Otoño', 'Invierno', 'Todo el año'];
const patienceLevels: PatienceLevel[] = ['Baja', 'Media', 'Alta'];

export class RecipeValidationError extends Error {
  constructor(readonly issues: RecipeValidationIssue[]) {
    super(issues.map((issue) => issue.message).join('\n'));
    this.name = 'RecipeValidationError';
  }
}

export class RecipeNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró la receta ${id}.`);
    this.name = 'RecipeNotFoundError';
  }
}

export function validateRecipeFields(input: RecipeFields): RecipeFields {
  const issues: RecipeValidationIssue[] = [];
  const title = input.title.trim();
  const description = input.description.trim();
  const category = input.category.trim();
  const grandmotherNotes = input.grandmotherNotes.trim();
  const personalNotes = input.personalNotes.trim();
  const visibility = input.visibility ?? 'private';

  if (!title) issues.push({ field: 'title', message: 'Escribe un título para la receta.' });
  if (title.length > 120) issues.push({ field: 'title', message: 'El título no puede superar 120 caracteres.' });
  if (description.length > 3000) issues.push({ field: 'description', message: 'La descripción no puede superar 3.000 caracteres.' });
  if (personalNotes.length > 5000) issues.push({ field: 'personalNotes', message: 'Las notas personales no pueden superar 5.000 caracteres.' });
  if (!category) issues.push({ field: 'category', message: 'Indica una categoría.' });
  if (category.length > 50) issues.push({ field: 'category', message: 'La categoría no puede superar 50 caracteres.' });
  if (!seasons.includes(input.idealSeason)) issues.push({ field: 'idealSeason', message: 'Selecciona una estación válida.' });
  if (!patienceLevels.includes(input.patienceLevel)) issues.push({ field: 'patienceLevel', message: 'Selecciona un nivel de paciencia válido.' });
  if (visibility !== 'private' && visibility !== 'public') issues.push({ field: 'visibility', message: 'Elige una visibilidad de receta válida.' });
  if (!Number.isInteger(input.totalMinutes) || input.totalMinutes < 1 || input.totalMinutes > 1440) {
    issues.push({ field: 'totalMinutes', message: 'El tiempo total debe ser un número entero entre 1 y 1.440 minutos.' });
  }
  if (!Number.isInteger(input.baseServings) || input.baseServings < 1 || input.baseServings > 100) {
    issues.push({ field: 'baseServings', message: 'Las porciones base deben ser un número entero entre 1 y 100.' });
  }
  if (input.imageLocalUri && !isLocalImageUri(input.imageLocalUri)) {
    issues.push({ field: 'imageLocalUri', message: 'La imagen debe ser local; no se permiten URLs externas.' });
  }
  if (input.ingredients.length === 0) issues.push({ field: 'ingredients', message: 'Añade al menos un ingrediente.' });
  input.ingredients.forEach((ingredient, index) => {
    if (!ingredient.name.trim()) issues.push({ field: 'ingredients', message: `Escribe el nombre del ingrediente ${index + 1}.` });
    if (ingredient.quantity !== null && (!Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0)) {
      issues.push({ field: 'ingredients', message: `La cantidad del ingrediente ${index + 1} debe ser mayor que cero o quedar vacía.` });
    }
    if (ingredient.name.trim().length > 100) issues.push({ field: 'ingredients', message: `El ingrediente ${index + 1} no puede superar 100 caracteres.` });
  });
  if (input.steps.length === 0) issues.push({ field: 'steps', message: 'Añade al menos un paso.' });
  input.steps.forEach((step, index) => {
    if (!step.title.trim()) issues.push({ field: 'steps', message: `Escribe un título para el paso ${index + 1}.` });
    if (!step.description.trim()) issues.push({ field: 'steps', message: `Escribe la descripción del paso ${index + 1}.` });
    if (step.timerMinutes !== null && (!Number.isInteger(step.timerMinutes) || step.timerMinutes < 1 || step.timerMinutes > 1440)) {
      issues.push({ field: 'steps', message: `El temporizador del paso ${index + 1} debe estar entre 1 y 1.440 minutos.` });
    }
  });

  if (issues.length) throw new RecipeValidationError(issues);

  return {
    ...input,
    title,
    description,
    category,
    grandmotherNotes,
    personalNotes,
    visibility,
    ownerUserId: input.ownerUserId ?? input.userId ?? null,
    imageLocalUri: input.imageLocalUri?.trim() || null,
    ingredients: input.ingredients.map((ingredient) => ({
      ...ingredient,
      name: ingredient.name.trim(),
      unit: ingredient.unit?.trim() || null,
    })),
    steps: input.steps.map((step, index) => ({
      ...step,
      number: index + 1,
      title: step.title.trim(),
      description: step.description.trim(),
    })),
  };
}

export function isLocalImageUri(value: string): boolean {
  const uri = value.trim();
  return /^(file|content|asset):\/\//i.test(uri)
    || /^assets[\\/]/i.test(uri)
    || /^[A-Za-z]:\\/.test(uri)
    || uri.startsWith('\\\\');
}
