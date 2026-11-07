import { normalizeIngredientName } from './normalize-name.ts';
import type { Season, SeasonalProduct } from '../../types/pantry';

type SeasonalProductSeed = Omit<SeasonalProduct, 'normalizedName'> & { normalizedName?: string; sortOrder: number };

export const seasonalProductSeeds: SeasonalProductSeed[] = [
  { id: '950d09ca-510e-4aa1-a6ad-000000000001', season: 'Primavera', name: 'Espárragos', category: 'Verdura', note: 'Tiernos y delicados.', sortOrder: 1 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000002', season: 'Primavera', name: 'Guisantes', category: 'Verdura', note: 'Dulces y recién desgranados.', sortOrder: 2 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000003', season: 'Primavera', name: 'Habas', category: 'Verdura', note: 'Van bien con hierbas frescas.', sortOrder: 3 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000004', season: 'Primavera', name: 'Fresas', category: 'Fruta', note: 'Aromáticas y jugosas.', sortOrder: 4 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000005', season: 'Primavera', name: 'Alcachofas', category: 'Verdura', note: 'Mejor cuando están firmes.', sortOrder: 5 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000006', season: 'Primavera', name: 'Espinacas', category: 'Verdura', note: 'Hojas tiernas para ensaladas y salteados.', sortOrder: 6 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000007', season: 'Verano', name: 'Tomates', category: 'Verdura', note: 'En su mejor momento para comer crudos.', sortOrder: 1 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000008', season: 'Verano', name: 'Calabacines', category: 'Verdura', note: 'Suaves y muy versátiles.', sortOrder: 2 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000009', season: 'Verano', name: 'Pimientos', category: 'Verdura', note: 'Dulces, coloridos y carnosos.', sortOrder: 3 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000010', season: 'Verano', name: 'Berenjenas', category: 'Verdura', note: 'Ideales para asar o cocinar a fuego lento.', sortOrder: 4 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000011', season: 'Verano', name: 'Melocotones', category: 'Fruta', note: 'Dulces y perfumados.', sortOrder: 5 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000012', season: 'Verano', name: 'Melón', category: 'Fruta', note: 'Refrescante y lleno de aroma.', sortOrder: 6 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000013', season: 'Otoño', name: 'Calabazas', category: 'Verdura', note: 'Dulces y perfectas para asar.', sortOrder: 1 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000014', season: 'Otoño', name: 'Setas', category: 'Setas', note: 'Cada variedad tiene su propio carácter.', sortOrder: 2 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000015', season: 'Otoño', name: 'Peras', category: 'Fruta', note: 'Jugosas para comer o llevar al horno.', sortOrder: 3 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000016', season: 'Otoño', name: 'Manzanas', category: 'Fruta', note: 'Crujientes y muy agradecidas en repostería.', sortOrder: 4 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000017', season: 'Otoño', name: 'Uvas', category: 'Fruta', note: 'Dulces para la mesa y los postres.', sortOrder: 5 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000018', season: 'Otoño', name: 'Granadas', category: 'Fruta', note: 'Sus granos aportan un punto fresco y ácido.', sortOrder: 6 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000019', season: 'Invierno', name: 'Naranjas', category: 'Fruta', note: 'Jugosas y llenas de aroma.', sortOrder: 1 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000020', season: 'Invierno', name: 'Mandarinas', category: 'Fruta', note: 'Fáciles de pelar y muy fragantes.', sortOrder: 2 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000021', season: 'Invierno', name: 'Puerros', category: 'Verdura', note: 'Suaves para caldos, cremas y tartas.', sortOrder: 3 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000022', season: 'Invierno', name: 'Coliflor', category: 'Verdura', note: 'Queda deliciosa asada o gratinada.', sortOrder: 4 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000023', season: 'Invierno', name: 'Brócoli', category: 'Verdura', note: 'Cocínalo poco para conservar su textura.', sortOrder: 5 },
  { id: '950d09ca-510e-4aa1-a6ad-000000000024', season: 'Invierno', name: 'Repollo', category: 'Verdura', note: 'Una verdura sencilla para guisos y ensaladas.', sortOrder: 6 },
];

export function getSeasonalProductSeeds(): (SeasonalProduct & { sortOrder: number })[] {
  return seasonalProductSeeds.map((product) => ({
    ...product,
    normalizedName: normalizeIngredientName(product.name),
  }));
}

export const seasons: Season[] = ['Primavera', 'Verano', 'Otoño', 'Invierno'];
