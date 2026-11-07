import { RecipeForm } from '@/components/RecipeForm';
import { useRecipeRepository } from '@/hooks/useRecipeRepository';
import type { RecipeFields } from '@/types/recipe';
import { router } from 'expo-router';

export default function CreateRecipeScreen() {
  const repository = useRecipeRepository();
  const save = async (fields: RecipeFields) => {
    const recipe = await repository.create(fields);
    router.replace({ pathname: '/recipes/[id]', params: { id: recipe.id } });
  };
  return <RecipeForm onSave={save} />;
}
