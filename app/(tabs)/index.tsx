import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { AppHeader } from '@/components/AppHeader';
import { BotanicalDecoration } from '@/components/BotanicalDecoration';
import { RecipeCarousel } from '@/components/RecipeCarousel';
import { SeasonSelector, type Season } from '@/components/SeasonSelector';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, radii } from '@/constants/theme';
import { toRecipePreviews } from '@/features/recipes/presentation';
import { useRecipeRepository } from '@/hooks/useRecipeRepository';
import type { PatienceLevel, RecipeSummary } from '@/types/recipe';

const patienceLevels: (PatienceLevel | 'Todas')[] = ['Todas', 'Baja', 'Media', 'Alta'];

export default function HomeScreen() {
  const repository = useRecipeRepository();
  const [season, setSeason] = useState<Season>('Todas');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [patience, setPatience] = useState<PatienceLevel | null>(null);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState('');
  const searchRef = useRef<ComponentRef<typeof TextInput>>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setError('');
    Promise.all([
      repository.list({
        search: query,
        category,
        season: season === 'Todas' ? null : season,
        patienceLevel: patience,
      }),
      repository.listCategories(),
    ]).then(([items, availableCategories]) => {
      if (!active) return;
      setRecipes(items);
      setCategories(availableCategories);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las recetas.');
    });
    return () => { active = false; };
  }, [repository, query, category, season, patience]));

  const toggleFavorite = async (recipe: RecipeSummary) => {
    try {
      await repository.setFavorite(recipe.id, !recipe.isFavorite);
      setRecipes((current) => current.map((item) => item.id === recipe.id ? { ...item, isFavorite: !item.isFavorite } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el favorito.');
    }
  };

  const previews = toRecipePreviews(recipes);
  const featured = previews.slice(0, Math.min(4, previews.length));

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}><AppHeader onSearchPress={() => searchRef.current?.focus()} onProfilePress={() => router.push('/kitchen')} /></View>
        <View style={styles.searchBox}>
          <SymbolView name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }} tintColor={colors.secondaryText} size={19} />
          <TextInput ref={searchRef} value={query} onChangeText={setQuery} placeholder="Busca por nombre" placeholderTextColor={colors.secondaryText} style={styles.searchInput} returnKeyType="search" />
          {query.length > 0 ? <Pressable accessibilityLabel="Borrar búsqueda" onPress={() => setQuery('')}><SymbolView name={{ android: 'close', ios: 'xmark.circle.fill', web: 'close' }} tintColor={colors.secondaryText} size={18} /></Pressable> : null}
        </View>

        <View style={styles.greeting}>
          <View style={styles.greetingCopy}>
            <Text style={styles.overline}>UN RATITO PARA TI</Text>
            <Text style={styles.title}>Hola, ¿qué cocinamos hoy?</Text>
            <Text style={styles.description}>Algo rico siempre empieza con calma.</Text>
          </View>
          <Image source={require('../../assets/images/fern-mouse.png')} style={styles.mouse} resizeMode="contain" />
          <View style={styles.leaf}><BotanicalDecoration size={30} /></View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/meal-planner' as never)} style={styles.mealPlanShortcut}>
          <View style={styles.mealPlanIcon}><SymbolView name={{ android: 'calendar_month', ios: 'calendar', web: 'calendar_month' }} tintColor={colors.greenDark} size={22} /></View>
          <View style={styles.mealPlanCopy}><Text style={styles.mealPlanTitle}>Mi menú</Text><Text style={styles.mealPlanDescription}>Organiza las comidas de tu semana</Text></View>
          <SymbolView name={{ android: 'arrow_forward', ios: 'arrow.right', web: 'arrow_forward' }} tintColor={colors.greenDark} size={18} />
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => router.push('/fermentation-lab' as never)} style={[styles.mealPlanShortcut, styles.fermentationShortcut]}>
          <View style={styles.mealPlanIcon}><SymbolView name={{ android: 'science', ios: 'testtube.2', web: 'science' }} tintColor={colors.greenDark} size={22} /></View>
          <View style={styles.mealPlanCopy}><Text style={styles.mealPlanTitle}>Mi laboratorio</Text><Text style={styles.mealPlanDescription}>Acompaña tus fermentos paso a paso</Text></View>
          <SymbolView name={{ android: 'arrow_forward', ios: 'arrow.right', web: 'arrow_forward' }} tintColor={colors.greenDark} size={18} />
        </Pressable>

        <View style={styles.section}>
          <SectionTitle title="Tu cuaderno" subtitle={`${recipes.length} recetas para volver a cocinar`} actionLabel="＋ Añadir" onActionPress={() => router.push('/recipes/new')} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {featured.length ? <RecipeCarousel recipes={featured} favorites={recipes.filter((recipe) => recipe.isFavorite).map((recipe) => recipe.id)} onRecipePress={(recipe) => router.push({ pathname: '/recipes/[id]', params: { id: recipe.id } })} onFavoritePress={(recipe) => { void toggleFavorite(recipe); }} /> : <Text style={styles.emptyHint}>{query ? 'No hay recetas con ese nombre.' : 'Aún no tienes recetas para estos filtros.'}</Text>}
        </View>

        <View style={styles.filtersBlock}>
          <SectionTitle title="Explora con calma" subtitle="Filtra tu colección" />
          <Text style={styles.filterLabel}>Categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {['Todas', ...categories].map((item) => {
              const selected = item === 'Todas' ? category === null : category === item;
              return <FilterChip key={item} label={item} selected={selected} onPress={() => setCategory(item === 'Todas' ? null : item)} />;
            })}
          </ScrollView>
          <Text style={styles.filterLabel}>Estación ideal</Text>
          <SeasonSelector selected={season} onSelect={setSeason} />
          <Text style={styles.filterLabel}>Paciencia</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {patienceLevels.map((level) => <FilterChip key={level} label={level} selected={(level === 'Todas' && patience === null) || level === patience} onPress={() => setPatience(level === 'Todas' ? null : level)} />)}
          </ScrollView>
        </View>

        <View style={styles.seasonSection}>
          <SectionTitle title="Para volver a hacer" subtitle="Tus recetas guardadas" actionLabel="Ver todas" onActionPress={() => router.push('/favorites')} />
          {recipes.some((recipe) => recipe.isFavorite)
            ? <RecipeCarousel recipes={toRecipePreviews(recipes.filter((recipe) => recipe.isFavorite))} favorites={recipes.filter((recipe) => recipe.isFavorite).map((recipe) => recipe.id)} onRecipePress={(recipe) => router.push({ pathname: '/recipes/[id]', params: { id: recipe.id } })} onFavoritePress={(recipe) => { void toggleFavorite(recipe); }} />
            : <Text style={styles.emptyHint}>Marca el corazón de una receta para guardarla aquí.</Text>}
        </View>

        <View style={styles.note}>
          <View style={styles.noteIcon}><SymbolView name={{ android: 'nutrition', ios: 'leaf.fill', web: 'nutrition' }} tintColor={colors.greenDark} size={20} /></View>
          <Text style={styles.noteText}>Hecho en casa sabe un poquito mejor.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.filterChip, selected && styles.filterChipActive]}><Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 30 },
  header: { paddingHorizontal: 22, paddingTop: 5, marginBottom: 14 },
  searchBox: { height: 49, marginHorizontal: 22, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radii.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, padding: 0, color: colors.text, fontSize: 13 },
  greeting: { minHeight: 166, marginHorizontal: 22, marginTop: 22, marginBottom: 30, paddingLeft: 20, paddingVertical: 22, paddingRight: 10, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.greenLight },
  greetingCopy: { flex: 1, zIndex: 1 }, overline: { marginBottom: 8, color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { maxWidth: 215, color: colors.text, fontFamily: 'serif', fontSize: 25, fontWeight: '700', letterSpacing: -0.5, lineHeight: 30 },
  description: { marginTop: 7, color: '#66755F', fontSize: 12, lineHeight: 18 }, mouse: { width: 102, height: 128, marginRight: -2, marginTop: 8 }, leaf: { position: 'absolute', top: 12, right: 15 },
  mealPlanShortcut: { minHeight: 69, marginHorizontal: 22, marginBottom: 30, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radii.md, backgroundColor: '#F8EDD1' }, fermentationShortcut: { backgroundColor: colors.greenLight }, mealPlanIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.cream }, mealPlanCopy: { flex: 1, gap: 3 }, mealPlanTitle: { color: colors.text, fontSize: 13, fontWeight: '700' }, mealPlanDescription: { color: colors.secondaryText, fontSize: 10 },
  section: { marginBottom: 28 }, filtersBlock: { marginHorizontal: 22, marginBottom: 27 }, filterLabel: { marginTop: 7, marginBottom: 9, color: colors.text, fontSize: 12, fontWeight: '700' }, chips: { gap: 8, paddingBottom: 6 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }, filterChipActive: { borderColor: colors.greenDark, backgroundColor: colors.greenDark }, filterChipText: { color: colors.secondaryText, fontSize: 11, fontWeight: '600' }, filterChipTextActive: { color: colors.white },
  seasonSection: { marginBottom: 24, paddingTop: 2 }, emptyHint: { marginHorizontal: 22, color: colors.secondaryText, fontSize: 13, lineHeight: 20 }, error: { marginHorizontal: 22, marginBottom: 10, color: '#994D43', fontSize: 12 },
  note: { marginHorizontal: 22, paddingHorizontal: 15, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radii.sm, backgroundColor: '#F1EADF' }, noteIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }, noteText: { color: colors.greenDark, fontFamily: 'serif', fontSize: 15, fontStyle: 'italic' },
});
