export type RecipeSeason = 'Primavera' | 'Verano' | 'Otoño' | 'Invierno' | 'Todo el año';
export type PatienceLevel = 'Baja' | 'Media' | 'Alta';

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  optional: boolean;
};

export type RecipeIngredientInput = Omit<RecipeIngredient, 'id'>;

export type RecipeStep = {
  id: string;
  number: number;
  title: string;
  description: string;
  timerMinutes: number | null;
};

export type RecipeStepInput = Omit<RecipeStep, 'id' | 'number'> & { number?: number };

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
};

export type RecipeSummary = {
  id: string;
  userId: string | null;
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
