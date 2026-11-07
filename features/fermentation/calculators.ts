export type FeedingCalculation = { starter: number; flour: number; water: number; total: number };

export function calculateSourdoughFeeding(starterAmount: number, flourRatio: number, waterRatio: number): FeedingCalculation {
  requirePositive(starterAmount, 'La cantidad de masa madre debe ser mayor que cero.');
  requirePositive(flourRatio, 'La proporción de harina debe ser mayor que cero.');
  requirePositive(waterRatio, 'La proporción de agua debe ser mayor que cero.');
  const flour = round(starterAmount * flourRatio);
  const water = round(starterAmount * waterRatio);
  return { starter: round(starterAmount), flour, water, total: round(starterAmount + flour + water) };
}

export function calculateHydration(flourGrams: number, waterGrams: number): number {
  requirePositive(flourGrams, 'El peso de la harina debe ser mayor que cero.');
  requireNonNegative(waterGrams, 'El peso del agua no puede ser negativo.');
  return round((waterGrams / flourGrams) * 100);
}

export function calculateBrineSalt(waterGrams: number, saltPercentage: number): number {
  requirePositive(waterGrams, 'El peso del agua debe ser mayor que cero.');
  requirePositive(saltPercentage, 'El porcentaje de sal debe ser mayor que cero.');
  if (saltPercentage > 100) throw new RangeError('El porcentaje de sal no puede superar el 100 %.');
  return round((waterGrams * saltPercentage) / 100);
}

export function convertWeight(value: number, fromUnit: 'g' | 'kg', toUnit: 'g' | 'kg'): number {
  requireNonNegative(value, 'El peso no puede ser negativo.');
  const grams = fromUnit === 'kg' ? value * 1000 : value;
  return round(toUnit === 'kg' ? grams / 1000 : grams);
}

function requirePositive(value: number, message: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(message);
}

function requireNonNegative(value: number, message: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(message);
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
