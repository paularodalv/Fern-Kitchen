export const LEVELS = [
  { name: 'Aprendiz de cocina', threshold: 0, description: 'Cada receta es una oportunidad para descubrir.' },
  { name: 'Manos de harina', threshold: 100, description: 'La práctica va encontrando su propio ritmo.' },
  { name: 'Cocinero curioso', threshold: 300, description: 'Tu cuaderno crece con nuevos sabores.' },
  { name: 'Artesano de sabores', threshold: 650, description: 'Cuidas cada detalle de lo que preparas.' },
  { name: 'Maestro de fermentos', threshold: 1100, description: 'La paciencia también forma parte de tu cocina.' },
  { name: 'Alma de Fern Kitchen', threshold: 1800, description: 'Una colección llena de historias propias.' },
] as const;

export const ACHIEVEMENTS = [
  { id: 'first-prepared-recipe', name: 'A la mesa', description: 'Termina tu primera receta en el modo de cocina.', category: 'Exploración y aprendizaje', icon: 'restaurant', hint: 'Completa una receta en modo de cocina.', xp: 25, sort: 1 },
  { id: 'first-personal-recipe', name: 'Receta de la casa', description: 'Guarda una receta propia en tu cuaderno.', category: 'Recetas propias', icon: 'menu_book', hint: 'Crea tu primera receta personal.', xp: 20, sort: 2 },
  { id: 'first-fermentation', name: 'Burbujas de vida', description: 'Registra un primer avance en el laboratorio.', category: 'Fermentación', icon: 'science', hint: 'Añade una observación o medida a un proyecto.', xp: 20, sort: 3 },
  { id: 'completed-fermentation', name: 'Con paciencia', description: 'Completa un proyecto de fermentación.', category: 'Fermentación', icon: 'spa', hint: 'Marca como completado un proyecto de fermentación.', xp: 35, sort: 4 },
  { id: 'three-recipes-prepared', name: 'Tres buenos momentos', description: 'Prepara tres recetas distintas.', category: 'Exploración y aprendizaje', icon: 'favorite', hint: 'Prepara recetas diferentes.', xp: 30, sort: 5 },
  { id: 'autumn-cook', name: 'Cocina de otoño', description: 'Completa una propuesta de temporada otoñal.', category: 'Cocina de temporada', icon: 'park', hint: 'Completa un reto de temporada.', xp: 20, sort: 6 },
].map((item) => ({ ...item, assetId: `achievement_${item.id.replaceAll('-', '_')}` }));

export const STICKERS = [
  ['bread-loaf', 'Hogaza dorada', 'Un pan hecho con calma.', 'bakery', '🥖', 'prepared', 'first', 'comun'],
  ['little-whisk', 'Batidor alegre', 'Para las mezclas que salen del corazón.', 'pastry', '🥄', 'recipe', 'first', 'comun'],
  ['starter-jar', 'Tarro burbujeante', 'Una pequeña colonia en marcha.', 'fermentation', '🫙', 'fermentation', 'first', 'comun'],
  ['preserve-jar', 'Tarro de conserva', 'Sabores guardados para otro día.', 'preserves', '🍯', 'event', 'summer-table', 'especial'],
  ['garden-tomato', 'Tomate de huerta', 'Un ingrediente en su mejor momento.', 'ingredients', '🍅', 'recipe', 'first', 'comun'],
  ['autumn-leaf', 'Hoja de otoño', 'Un guiño a la cocina de temporada.', 'seasons', '🍂', 'event', 'autumn-table', 'especial'],
  ['mouse-apron', 'Delantal de Fern', 'Un detalle para celebrar tus avances.', 'special', '🐭', 'event', 'winter-table', 'raro'],
  ['spring-bloom', 'Flor nueva', 'Un recuerdo de tus observaciones de primavera.', 'seasons', '🌱', 'event', 'spring-table', 'especial'],
].map(([id, name, description, collection, icon, unlockType, unlockValue, rarity], index) => ({ id, name, description, collection, icon, unlockType, unlockValue, rarity, sort: index + 1, assetId: `sticker_${String(id).replaceAll('-', '_')}` }));

export const STICKER_COLLECTIONS = [
  { id: 'bakery', name: 'Panadería', description: 'Harina, horno y panes hechos con calma.', reward: 'Borde de panadero', sort: 1 },
  { id: 'pastry', name: 'Repostería', description: 'Pequeños dulces para compartir.', reward: 'Papel dulce y delicado', sort: 2 },
  { id: 'fermentation', name: 'Fermentos', description: 'Cultivos vivos y observaciones pacientes.', reward: 'Detalle de fermentista', sort: 3 },
  { id: 'preserves', name: 'Conservas', description: 'Sabores que guardamos para más adelante.', reward: 'Fondo de conserva', sort: 4 },
  { id: 'ingredients', name: 'Ingredientes', description: 'Productos sencillos que inspiran recetas.', reward: 'Borde de huerta', sort: 5 },
  { id: 'seasons', name: 'Estaciones', description: 'Cocina que sigue el ritmo del año.', reward: 'Papel de temporada', sort: 6 },
  { id: 'special', name: 'Especiales', description: 'Recuerdos de retos y momentos señalados.', reward: 'Accesorio especial', sort: 7 },
];

export const COSMETICS = [
  { id: 'frame-fern', kind: 'frame', name: 'Borde de helechos', icon: 'filter_vintage', description: 'Un marco verde suave.', default: true },
  { id: 'frame-butter', kind: 'frame', name: 'Borde mantequilla', icon: 'circle', description: 'Un marco cálido.', default: true },
  { id: 'background-cream', kind: 'background', name: 'Papel crema', icon: 'crop_square', description: 'El papel claro del cuaderno.', default: true },
  { id: 'background-garden', kind: 'background', name: 'Jardín suave', icon: 'yard', description: 'Un fondo verde de jardín.', default: true },
  { id: 'accessory-flower', kind: 'accessory', name: 'Flor de temporada', icon: 'local_florist', description: 'Un pequeño detalle floral.', default: true },
  { id: 'accessory-spoon', kind: 'accessory', name: 'Cuchara de madera', icon: 'restaurant', description: 'Un guiño a la cocina de siempre.', default: true },
  { id: 'frame-gold', kind: 'frame', name: 'Borde dorado', icon: 'stars', description: 'Desbloqueado al alcanzar Manos de harina.', default: false, unlockType: 'level', unlockValue: '2' },
  { id: 'collection-bakery-frame', kind: 'frame', name: 'Borde de panadero', icon: 'bakery_dining', description: 'Completa la colección Panadería.', default: false, unlockType: 'sticker_collection', unlockValue: 'bakery' },
  { id: 'collection-ferment-accessory', kind: 'accessory', name: 'Burbuja fermentista', icon: 'bubble_chart', description: 'Completa la colección Fermentos.', default: false, unlockType: 'sticker_collection', unlockValue: 'fermentation' },
  { id: 'collection-preserve-background', kind: 'background', name: 'Fondo de conserva', icon: 'inventory_2', description: 'Completa la colección Conservas.', default: false, unlockType: 'sticker_collection', unlockValue: 'preserves' },
  { id: 'collection-special-accessory', kind: 'accessory', name: 'Estrellita de Fern', icon: 'stars', description: 'Completa la colección Especiales.', default: false, unlockType: 'sticker_collection', unlockValue: 'special' },
].map((item) => ({ ...item, assetId: `cosmetic_${item.id.replaceAll('-', '_')}` }));

export const RECIPE_DESIGNS = [
  { id: 'classic', name: 'Cuaderno clásico', description: 'Papel crema y tinta verde.', accent: '#548B35', background: '#FFF8EB', icon: 'menu_book', unlock: 'default', value: '' },
  { id: 'botanical', name: 'Botánico', description: 'Un acento de jardín.', accent: '#37652C', background: '#E5EFD9', icon: 'spa', unlock: 'default', value: '' },
  { id: 'artisan', name: 'Panadería artesanal', description: 'Tonos de harina recién molida.', accent: '#9A673B', background: '#F5E8D4', icon: 'bakery_dining', unlock: 'achievement', value: 'first-prepared-recipe' },
  { id: 'delicate', name: 'Dulce y delicado', description: 'Un toque suave de melocotón.', accent: '#A15E55', background: '#FBE9E2', icon: 'cake', unlock: 'achievement', value: 'first-personal-recipe' },
  { id: 'autumn', name: 'Otoño', description: 'Colores de cosecha.', accent: '#8D5A2B', background: '#F7E9D0', icon: 'park', unlock: 'event', value: 'autumn-table' },
  { id: 'spring', name: 'Primavera', description: 'Verde nuevo y luz.', accent: '#548B35', background: '#EAF2D8', icon: 'local_florist', unlock: 'level', value: '2' },
  { id: 'festive', name: 'Especial festivo', description: 'Para compartir en días especiales.', accent: '#9D4F45', background: '#F8E8DD', icon: 'celebration', unlock: 'event', value: 'winter-table' },
].map((item, index) => ({ ...item, sort: index + 1, assetId: `recipe_design_${item.id.replaceAll('-', '_')}` }));

export const EVENTS = [
  { id: 'autumn-table', title: 'Otoño en la cocina', description: 'Celebra los ingredientes de temporada y guarda un nuevo recuerdo en tu cuaderno.', starts: '2026-10-01', ends: '2026-12-01', icon: 'park', reward: 'Hoja de otoño', challenge: { id: 'autumn-recipe', title: 'Una receta de temporada', description: 'Crea una receta personal con estación Otoño.', action: 'autumn_recipe', target: 1, xp: 20, sticker: 'autumn-leaf' } },
  { id: 'bread-week', title: 'Semana del pan', description: 'Dedica un momento a preparar una hogaza y guardar lo aprendido.', starts: '2026-11-16', ends: '2026-11-23', icon: 'bakery_dining', reward: 'Hogaza dorada', challenge: { id: 'bread-week-loaf', title: 'Una receta al horno', description: 'Termina una receta en modo de cocina.', action: 'prepared_recipe', target: 1, xp: 20, sticker: 'bread-loaf' } },
  { id: 'winter-table', title: 'Navidad casera', description: 'Pequeños preparativos para una mesa compartida.', starts: '2026-12-01', ends: '2027-01-07', icon: 'cookie', reward: 'Un estilo festivo y el delantal de Fern', challenge: { id: 'winter-recipe', title: 'Un detalle para compartir', description: 'Prepara una receta en modo de cocina.', action: 'prepared_recipe', target: 1, xp: 20, sticker: 'mouse-apron' } },
  { id: 'spring-table', title: 'Primavera fermentista', description: 'Sigue con curiosidad los cambios de tus fermentos.', starts: '2027-03-01', ends: '2027-05-31', icon: 'local_florist', reward: 'Estilo de primavera y una flor', challenge: { id: 'spring-ferment', title: 'Anota un cambio', description: 'Registra una observación en el laboratorio.', action: 'fermentation_event', target: 1, xp: 20, sticker: 'spring-bloom' } },
  { id: 'summer-table', title: 'Verano de conservas', description: 'Guarda ideas para disfrutar la temporada más adelante.', starts: '2027-06-01', ends: '2027-08-31', icon: 'wb_sunny', reward: 'Estilo de verano y un tarro de conserva', challenge: { id: 'summer-recipe', title: 'Añade una receta de verano', description: 'Crea una receta personal de verano.', action: 'summer_recipe', target: 1, xp: 20, sticker: 'preserve-jar' } },
].map((item) => ({ ...item, assetId: `event_${item.id.replaceAll('-', '_')}` }));
