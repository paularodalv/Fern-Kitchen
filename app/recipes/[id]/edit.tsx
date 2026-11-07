import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { RecipeForm } from '@/components/RecipeForm';
import { colors } from '@/constants/theme';
import { useRecipeRepository } from '@/hooks/useRecipeRepository';
import type { Recipe, RecipeFields } from '@/types/recipe';
import { useKitchenTimerRepository } from '@/hooks/useKitchenTimerRepository';
import { cancelLocalReminder } from '@/services/notifications';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repository = useRecipeRepository();
  const timerRepository = useKitchenTimerRepository();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    repository.getById(id).then((item) => {
      if (!active) return;
      if (!item) setError('No se encontró esta receta.');
      else setRecipe(item);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudo abrir la receta.');
    });
    return () => { active = false; };
  }, [id, repository]);

  const save = async (fields: RecipeFields) => {
    const timers = await timerRepository.listForRecipe(id);
    await repository.update(id, fields);
    await Promise.all(timers.map((timer) => timer.notificationId ? cancelLocalReminder(timer.notificationId).catch(() => undefined) : Promise.resolve()));
    router.replace({ pathname: '/recipes/[id]', params: { id } });
  };

  if (error) return <Message text={error} />;
  if (!recipe) return <View style={styles.loading}><ActivityIndicator color={colors.greenDark} /></View>;
  return <RecipeForm initialRecipe={recipe} onSave={save} />;
}

function Message({ text }: { text: string }) {
  return <View style={styles.loading}><Text style={styles.error}>{text}</Text></View>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24 }, error: { color: '#994D43', fontSize: 14, textAlign: 'center' } });
