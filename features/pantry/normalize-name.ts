export function normalizeIngredientName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-ES');
}
