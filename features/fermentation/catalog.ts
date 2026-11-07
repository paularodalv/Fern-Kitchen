export type FermentationTemplate = { id: string; label: string; suggestedFields: { name: string; type: 'text' | 'number' | 'measurement' | 'date' | 'boolean'; unit?: string }[]; supportsFeeding: boolean; supportsBatches: boolean };

export const fermentationTemplates: FermentationTemplate[] = [
  { id: 'sourdough', label: 'Masa madre', supportsFeeding: true, supportsBatches: false, suggestedFields: [{ name: 'Hidratación', type: 'measurement', unit: '%' }, { name: 'Temperatura', type: 'measurement', unit: '°C' }, { name: 'pH', type: 'number' }, { name: 'Aumento de volumen', type: 'measurement', unit: '%' }] },
  { id: 'kombucha', label: 'Kombucha', supportsFeeding: false, supportsBatches: true, suggestedFields: [{ name: 'Temperatura', type: 'measurement', unit: '°C' }, { name: 'pH', type: 'number' }, { name: 'Volumen', type: 'measurement', unit: 'ml' }] },
  { id: 'milk_kefir', label: 'Kéfir de leche', supportsFeeding: true, supportsBatches: true, suggestedFields: [{ name: 'Temperatura', type: 'measurement', unit: '°C' }, { name: 'Tiempo', type: 'number', unit: 'h' }] },
  { id: 'water_kefir', label: 'Kéfir de agua', supportsFeeding: true, supportsBatches: true, suggestedFields: [{ name: 'Temperatura', type: 'measurement', unit: '°C' }, { name: 'Volumen', type: 'measurement', unit: 'ml' }] },
  { id: 'yogurt', label: 'Yogur', supportsFeeding: false, supportsBatches: true, suggestedFields: [{ name: 'Temperatura', type: 'measurement', unit: '°C' }, { name: 'pH', type: 'number' }] },
  { id: 'fermented_vegetables', label: 'Verduras fermentadas', supportsFeeding: false, supportsBatches: true, suggestedFields: [{ name: 'Sal', type: 'measurement', unit: '%' }, { name: 'Temperatura', type: 'measurement', unit: '°C' }, { name: 'pH', type: 'number' }] },
  { id: 'sauerkraut', label: 'Chucrut', supportsFeeding: false, supportsBatches: true, suggestedFields: [{ name: 'Sal', type: 'measurement', unit: '%' }, { name: 'Peso de prensado', type: 'measurement', unit: 'g' }, { name: 'pH', type: 'number' }] },
  { id: 'kimchi', label: 'Kimchi', supportsFeeding: false, supportsBatches: true, suggestedFields: [{ name: 'Sal', type: 'measurement', unit: '%' }, { name: 'Temperatura', type: 'measurement', unit: '°C' }, { name: 'pH', type: 'number' }] },
  { id: 'vinegar', label: 'Vinagre', supportsFeeding: false, supportsBatches: true, suggestedFields: [{ name: 'Temperatura', type: 'measurement', unit: '°C' }, { name: 'pH', type: 'number' }] },
  { id: 'other', label: 'Otros fermentos personalizados', supportsFeeding: false, supportsBatches: true, suggestedFields: [] },
];

export function getFermentationLabel(type: string, customName?: string | null): string {
  if (type === 'custom' && customName?.trim()) return customName.trim();
  return fermentationTemplates.find((item) => item.id === type)?.label ?? customName ?? 'Otro fermento';
}

export const fermentationStatuses = [
  { id: 'planned', label: 'Planificado' },
  { id: 'active', label: 'Activo' },
  { id: 'observing', label: 'En observación' },
  { id: 'paused', label: 'Pausado' },
  { id: 'completed', label: 'Completado' },
  { id: 'discarded', label: 'Descartado' },
] as const;
