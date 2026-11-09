export type RecipeSeason = 'Primavera' | 'Verano' | 'Otoño' | 'Invierno' | 'Todo el año';
export type PatienceLevel = 'Baja' | 'Media' | 'Alta';
export type RecipeVisibility = 'private' | 'public';

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecipeIngredientInput = Omit<RecipeIngredient, 'id' | 'createdAt' | 'updatedAt'>;

export type RecipeStep = {
  id: string;
  number: number;
  title: string;
  description: string;
  timerMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

export type RecipeStepInput = Omit<RecipeStep, 'id' | 'number' | 'createdAt' | 'updatedAt'> & { number?: number };

export type RecipeFields = {
  title: string;
  description: string;
  imageLocalUri: string | null;
  idealSeason: RecipeSeason;
  category: string;
  totalMinutes: number;
  patienceLevel: PatienceLevel;
  baseServings: number;
  ingredients: RecipeIngredientInput[];
  steps: RecipeStepInput[];
  grandmotherNotes: string;
  personalNotes: string;
  userId?: string | null;
  ownerUserId?: string | null;
  visibility?: RecipeVisibility;
};

export type RecipeSummary = {
  id: string;
  userId: string | null;
  ownerUserId: string | null;
  title: string;
  description: string;
  imageLocalUri: string | null;
  idealSeason: RecipeSeason;
  category: string;
  totalMinutes: number;
  patienceLevel: PatienceLevel;
  baseServings: number;
  grandmotherNotes: string;
  personalNotes: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  visibility: RecipeVisibility;
};

export type Recipe = RecipeSummary & {
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type RecipeFilters = {
  search?: string;
  category?: string | null;
  season?: RecipeSeason | null;
  patienceLevel?: PatienceLevel | null;
  favoritesOnly?: boolean;
};

export type RecipeValidationField = keyof RecipeFields | 'ingredients' | 'steps';
export type RecipeValidationIssue = { field: RecipeValidationField; message: string };
