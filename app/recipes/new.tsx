import { RecipeForm } from '@/components/RecipeForm';
import { useRecipeRepository } from '@/hooks/useRecipeRepository';
import type { RecipeFields } from '@/types/recipe';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { useCollectionRepository } from '@/hooks/useCollectionRepository';

export default function CreateRecipeScreen() {
  const repository = useRecipeRepository();
  const collection = useCollectionRepository();
  const save = async (fields: RecipeFields) => {
    const recipe = await repository.create(fields);
    const openRecipe = () => router.replace({ pathname: '/recipes/[id]', params: { id: recipe.id } });
    let rewards: string[];
    try {
      rewards = await collection.recordAction('personal_recipe', recipe.id);
      if (fields.idealSeason === 'Otoño') rewards.push(...await collection.recordAction('autumn_recipe', recipe.id));
      if (fields.idealSeason === 'Verano') rewards.push(...await collection.recordAction('summer_recipe', recipe.id));
    } catch {
      Alert.alert('Receta guardada', 'Tu receta está en el cuaderno, pero no se pudo actualizar el progreso de la colección.', [{ text: 'Ver receta', onPress: openRecipe }]);
      return;
    }
    if (rewards.length) Alert.alert('Un nuevo hito', `Has desbloqueado «${rewards[0]}».`, [
      { text: 'Ver colección', onPress: () => router.replace('/collection' as never) },
      { text: 'Ver receta', onPress: openRecipe },
    ]);
    else openRecipe();
  };
  return <RecipeForm onSave={save} />;
}
