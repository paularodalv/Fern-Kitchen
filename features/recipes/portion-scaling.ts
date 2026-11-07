export function scaleQuantity(quantity: number | null, baseServings: number, desiredServings: number): number | null {
  if (!Number.isInteger(baseServings) || baseServings <= 0) throw new RangeError('Las porciones base deben ser un entero positivo.');
  if (!Number.isInteger(desiredServings) || desiredServings <= 0) throw new RangeError('Las porciones deseadas deben ser un entero positivo.');
  if (quantity === null) return null;
  if (!Number.isFinite(quantity) || quantity < 0) throw new RangeError('La cantidad debe ser un número finito no negativo.');

  const scaled = (quantity * desiredServings) / baseServings;
  return Math.round((scaled + Number.EPSILON * Math.sign(scaled)) * 100) / 100;
}

export function formatQuantity(quantity: number | null): string {
  if (quantity === null) return '';
  if (!Number.isFinite(quantity) || quantity < 0) throw new RangeError('La cantidad debe ser un número finito no negativo.');

  const rounded = Math.round((quantity + Number.EPSILON) * 100) / 100;
  const whole = Math.floor(rounded);
  const fraction = rounded - whole;
  const fractions: Array<[number, string]> = [
    [0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, ''],
  ];
  const closest = fractions.reduce((best, candidate) => (
    Math.abs(candidate[0] - fraction) < Math.abs(best[0] - fraction) ? candidate : best
  ));

  if (Math.abs(closest[0] - fraction) <= 0.015) {
    const roundedWhole = closest[0] === 1 ? whole + 1 : whole;
    if (roundedWhole === 0 && closest[1] === '') return '0';
    if (roundedWhole === 0) return closest[1];
    return `${roundedWhole}${closest[1]}`;
  }

  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(rounded);
}
