import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/EmptyState';
import { RecipeCarousel } from '@/components/RecipeCarousel';
import { SectionTitle } from '@/components/SectionTitle';
import { colors } from '@/constants/theme';
import { toRecipePreviews } from '@/features/recipes/presentation';
import { useRecipeRepository } from '@/hooks/useRecipeRepository';
import type { RecipeSummary } from '@/types/recipe';

export default function FavoritesScreen() {
  const repository = useRecipeRepository();
  const [savedRecipes, setSavedRecipes] = useState<RecipeSummary[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    repository.list({ favoritesOnly: true }).then((items) => {
      if (active) setSavedRecipes(items);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar tus favoritas.');
    });
    return () => { active = false; };
  }, [repository]));

  const toggleFavorite = async (recipe: RecipeSummary) => {
    try {
      await repository.setFavorite(recipe.id, false);
      setSavedRecipes((current) => current.filter((item) => item.id !== recipe.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo quitar de favoritos.');
    }
  };

  const favorites = toRecipePreviews(savedRecipes);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><AppHeader /></View>
        <Text style={styles.eyebrow}>PARA REPETIR</Text>
        <Text style={styles.title}>Tus favoritas</Text>
        <Text style={styles.lede}>Esos platos que siempre sientan bien.</Text>
        <View style={styles.count}><Text style={styles.countText}>{savedRecipes.length} recetas guardadas</Text></View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {favorites.length ? (
          <>
            <View style={styles.section}><SectionTitle title="Guardadas con cariño" subtitle="Para cuando te apetezca" /></View>
            <RecipeCarousel recipes={favorites} favorites={savedRecipes.map((recipe) => recipe.id)} onRecipePress={(recipe) => router.push({ pathname: '/recipes/[id]', params: { id: recipe.id } })} onFavoritePress={(recipe) => { const selected = savedRecipes.find((item) => item.id === recipe.id); if (selected) void toggleFavorite(selected); }} />
            <View style={styles.footer}><Text style={styles.footerText}>Las buenas recetas siempre vuelven a la mesa.</Text></View>
          </>
        ) : <View style={styles.empty}><EmptyState title="Todavía sin favoritas">Guarda una receta con el corazón y la encontrarás aquí.</EmptyState></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 32 },
  header: { paddingHorizontal: 22, paddingTop: 5, marginBottom: 27 }, eyebrow: { marginHorizontal: 22, color: colors.greenDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { marginHorizontal: 22, marginTop: 5, color: colors.text, fontFamily: 'serif', fontSize: 34, fontWeight: '700' }, lede: { marginHorizontal: 22, marginTop: 5, color: colors.secondaryText, fontSize: 14 },
  count: { alignSelf: 'flex-start', marginHorizontal: 22, marginTop: 18, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: colors.peach, borderRadius: 30 }, countText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  section: { marginHorizontal: 22, marginTop: 31, marginBottom: 2 }, footer: { marginHorizontal: 22, marginTop: 30, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E9E4D8' }, footerText: { color: colors.secondaryText, fontFamily: 'serif', fontStyle: 'italic', fontSize: 15 },
  empty: { height: 390, marginTop: 22 }, error: { marginHorizontal: 22, marginTop: 14, color: '#994D43', fontSize: 12 },
});
