export type Season = 'Primavera' | 'Verano' | 'Otoño' | 'Invierno';

export type PantryItemFields = {
  name: string;
  quantity: number;
  unit: string;
  purchaseDate: string | null;
  bestBeforeDate: string | null;
  category: string;
  notes: string;
  imageLocalUri?: string | null;
  userId?: string | null;
};

export type PantryItem = PantryItemFields & {
  id: string;
  userId: string | null;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
};

export type PantryFilters = { category?: string | null; search?: string };

export type SeasonalProduct = {
  id: string;
  season: Season;
  name: string;
  normalizedName: string;
  category: string;
  note: string;
};
