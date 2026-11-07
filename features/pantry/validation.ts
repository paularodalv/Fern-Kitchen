import type { PantryItemFields } from '../../types/pantry';
import { normalizeIngredientName } from './normalize-name.ts';

export class PantryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PantryValidationError';
  }
}

export class PantryItemNotFoundError extends Error {
  constructor(id: string) {
    super(`No se encontró el ingrediente ${id}.`);
    this.name = 'PantryItemNotFoundError';
  }
}

export function validatePantryItem(input: PantryItemFields): PantryItemFields & { normalizedName: string } {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const unit = input.unit.trim();
  const category = input.category.trim();
  const notes = input.notes.trim();

  if (!name) throw new PantryValidationError('Escribe el nombre del ingrediente.');
  if (name.length > 100) throw new PantryValidationError('El nombre no puede superar 100 caracteres.');
  if (!Number.isFinite(input.quantity) || input.quantity < 0 || input.quantity > 100_000) {
    throw new PantryValidationError('La cantidad debe estar entre 0 y 100.000.');
  }
  if (!unit || unit.length > 30) throw new PantryValidationError('Indica una unidad de hasta 30 caracteres.');
  if (!category || category.length > 40) throw new PantryValidationError('Indica una categoría de hasta 40 caracteres.');
  if (notes.length > 600) throw new PantryValidationError('Las notas no pueden superar 600 caracteres.');
  validateDate(input.purchaseDate, 'La fecha de compra');
  validateDate(input.bestBeforeDate, 'La fecha de consumo preferente');
  if (input.purchaseDate && input.bestBeforeDate && input.bestBeforeDate < input.purchaseDate) {
    throw new PantryValidationError('La fecha de consumo preferente debe ser posterior a la compra.');
  }

  return {
    ...input,
    name,
    unit,
    category,
    notes,
    purchaseDate: input.purchaseDate || null,
    bestBeforeDate: input.bestBeforeDate || null,
    normalizedName: normalizeIngredientName(name),
  };
}

function validateDate(value: string | null, label: string): void {
  if (!value) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PantryValidationError(`${label} debe usar el formato AAAA-MM-DD.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new PantryValidationError(`${label} no es válida.`);
  }
}
