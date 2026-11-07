import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { BotanicalDecoration } from '@/components/BotanicalDecoration';
import { SectionTitle } from '@/components/SectionTitle';
import { TimerCard } from '@/components/TimerCard';
import { colors, radii } from '@/constants/theme';
import { useRecipeRepository } from '@/hooks/useRecipeRepository';
import { useKitchenTimerRepository } from '@/hooks/useKitchenTimerRepository';
import { cancelLocalReminder } from '@/services/notifications';
import { formatQuantity, scaleQuantity } from '@/features/recipes/portion-scaling';
import type { Recipe } from '@/types/recipe';
import { useCollectionRepository } from '@/hooks/useCollectionRepository';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repository = useRecipeRepository();
  const timerRepository = useKitchenTimerRepository();
  const collectionRepository = useCollectionRepository();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [personalNotes, setPersonalNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const [error, setError] = useState('');
  const [designId, setDesignId] = useState('classic');

  useFocusEffect(useCallback(() => {
    let active = true;
    repository.getById(id).then((item) => {
      if (!active) return;
      setRecipe(item);
      if (item) {
        setServings(item.baseServings);
        setPersonalNotes(item.personalNotes);
        setNotesSaved(true);
      }
      else setError('No se encontró esta receta.');
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la receta.');
    });
    collectionRepository.getRecipeDesign(id).then((value) => { if (active) setDesignId(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [id, repository, collectionRepository]));

  const toggleIngredient = (ingredientId: string) => setCheckedIngredients((current) => current.includes(ingredientId)
    ? current.filter((item) => item !== ingredientId)
    : [...current, ingredientId]);

  const toggleFavorite = async () => {
    if (!recipe) return;
    try {
      await repository.setFavorite(recipe.id, !recipe.isFavorite);
      setRecipe({ ...recipe, isFavorite: !recipe.isFavorite });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el favorito.');
    }
  };

  const removeRecipe = () => {
    if (!recipe) return;
    Alert.alert('Eliminar receta', `¿Quieres eliminar «${recipe.title}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        void (async () => {
          const timers = await timerRepository.listForRecipe(recipe.id);
          await repository.delete(recipe.id);
          await Promise.all(timers.map((timer) => timer.notificationId ? cancelLocalReminder(timer.notificationId).catch(() => undefined) : Promise.resolve()));
          router.replace('/');
        })().catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la receta.');
        });
      } },
    ]);
  };

  const savePersonalNotes = async () => {
    if (!recipe) return;
    try {
      await repository.updatePersonalNotes(recipe.id, personalNotes);
      setRecipe({ ...recipe, personalNotes: personalNotes.trim() });
      setNotesSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar tus notas.');
    }
  };

  if (!recipe) {
    return <SafeAreaView style={styles.loading}><Text style={styles.loadingText}>{error || 'Cargando receta…'}</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: designId === 'botanical' ? colors.greenLight : designId === 'autumn' ? '#F7E9D0' : designId === 'delicate' ? '#FBE9E2' : designId === 'artisan' ? '#F5E8D4' : seasonTone(recipe.idealSeason) }]}>
          {recipe.imageLocalUri ? <Image source={{ uri: recipe.imageLocalUri }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : (
            <View style={styles.heroPlaceholder}>
              <SymbolView name={{ android: 'restaurant', ios: 'fork.knife', web: 'restaurant' }} tintColor="#8D6E50" size={46} />
              <Text style={styles.heroPlaceholderText}>{recipe.category}</Text>
            </View>
          )}
          <View style={styles.heroShade} />
          <View style={styles.heroActions}>
            <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.heroButton}><SymbolView name={{ android: 'arrow_back', ios: 'arrow.left', web: 'arrow_back' }} tintColor={colors.text} size={21} /></Pressable>
            <View style={styles.actionGroup}>
              <Pressable accessibilityLabel="Editar receta" onPress={() => router.push({ pathname: '/recipes/[id]/edit', params: { id: recipe.id } } as never)} style={styles.heroButton}><SymbolView name={{ android: 'edit', ios: 'pencil', web: 'edit' }} tintColor={colors.text} size={19} /></Pressable>
              <Pressable accessibilityLabel={recipe.isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'} onPress={() => { void toggleFavorite(); }} style={styles.heroButton}><SymbolView name={{ android: recipe.isFavorite ? 'favorite' : 'favorite_border', ios: recipe.isFavorite ? 'heart.fill' : 'heart', web: recipe.isFavorite ? 'favorite' : 'favorite_border' }} tintColor={recipe.isFavorite ? colors.coral : colors.text} size={21} /></Pressable>
            </View>
          </View>
          <View style={styles.heroTag}><Text style={styles.heroTagText}>{recipe.idealSeason.toUpperCase()} · {recipe.category.toUpperCase()}</Text></View>
        </View>

        <View style={styles.recipeBody}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>UNA RECETA PARA DISFRUTAR</Text>
              <Text style={styles.title}>{recipe.title}</Text>
              <Text style={styles.subtitle}>{recipe.description}</Text>
            </View>
            <BotanicalDecoration size={31} />
          </View>

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.meta}>
            <MetaCell icon="schedule" iosIcon="clock" value={`${recipe.totalMinutes} min`} label="Tiempo" />
            <View style={styles.divider} />
            <MetaCell icon="hourglass_empty" iosIcon="hourglass" value={recipe.patienceLevel} label="Paciencia" />
            <View style={styles.divider} />
            <View style={styles.servingsCell}><Text style={styles.metaLabel}>Porciones</Text><View style={styles.stepper}><Pressable accessibilityLabel="Una porción menos" onPress={() => setServings((value) => Math.max(1, value - 1))} style={styles.step}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.servingCount}>{servings}</Text><Pressable accessibilityLabel="Una porción más" onPress={() => setServings((value) => Math.min(100, value + 1))} style={styles.step}><Text style={styles.stepText}>+</Text></Pressable></View></View>
          </View>

          <Pressable onPress={() => router.push({ pathname: '/recipes/[id]/cook', params: { id: recipe.id } } as never)} style={styles.cookButton}>
            <SymbolView name={{ android: 'restaurant', ios: 'fork.knife', web: 'restaurant' }} tintColor={colors.white} size={18} />
            <Text style={styles.cookButtonText}>Empezar a cocinar</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/collection/designs', params: { recipeId: recipe.id } } as never)} style={styles.designButton}>
            <SymbolView name={{ android: 'palette', ios: 'paintpalette', web: 'palette' }} tintColor={colors.greenDark} size={16} />
            <Text style={styles.designButtonText}>Diseño: {designId === 'classic' ? 'Cuaderno clásico' : designId === 'botanical' ? 'Botánico' : designId === 'artisan' ? 'Panadería artesanal' : designId === 'delicate' ? 'Dulce y delicado' : designId === 'autumn' ? 'Otoño' : designId === 'spring' ? 'Primavera' : 'Especial festivo'}</Text>
          </Pressable>

          <View style={styles.section}>
            <SectionTitle title="Lo que necesitas" subtitle={`Cantidades calculadas desde ${recipe.baseServings} porciones base`} />
            {recipe.ingredients.map((ingredient) => {
              const checked = checkedIngredients.includes(ingredient.id);
              const scaled = scaleQuantity(ingredient.quantity, recipe.baseServings, servings);
              const quantityText = scaled === null ? (ingredient.unit === 'al gusto' ? 'al gusto' : '') : `${formatQuantity(scaled)}${ingredient.unit ? ` ${ingredient.unit}` : ''}`;
              return (
                <Pressable key={ingredient.id} onPress={() => toggleIngredient(ingredient.id)} style={styles.ingredient}>
                  <View style={[styles.checkbox, checked && styles.checked]}>{checked ? <SymbolView name={{ android: 'check', ios: 'checkmark', web: 'check' }} tintColor={colors.white} size={13} /> : null}</View>
                  <View style={styles.ingredientCopy}><Text style={[styles.ingredientName, checked && styles.crossed]}>{ingredient.name}</Text>{ingredient.optional ? <Text style={styles.optional}>Opcional</Text> : null}</View>
                  <Text style={styles.amount}>{quantityText}</Text>
                </Pressable>
              );
            })}
          </View>

          {recipe.description ? <View style={styles.section}><SectionTitle title="Un poco de historia" /><Text style={styles.description}>{recipe.description}</Text></View> : null}

          <View style={styles.section}>
            <SectionTitle title="Manos a la masa" subtitle="Paso a paso, sin prisa" />
            {recipe.steps.map((step) => (
              <View key={step.id} style={styles.stepBlock}>
                <View style={styles.stepRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{String(step.number).padStart(2, '0')}</Text></View>
                  <View style={styles.stepCopy}><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.stepDescription}>{step.description}</Text></View>
                </View>
                {step.timerMinutes ? <TimerCard recipeId={recipe.id} stepId={step.id} title={step.title} minutes={step.timerMinutes} /> : null}
              </View>
            ))}
          </View>

          {recipe.grandmotherNotes ? <View style={styles.noteCard}><View style={styles.noteIcon}><SymbolView name={{ android: 'lightbulb', ios: 'lightbulb', web: 'lightbulb' }} tintColor="#926D22" size={19} /></View><View style={{ flex: 1 }}><Text style={styles.noteTitle}>Nota de la abuela</Text><Text style={styles.noteText}>{recipe.grandmotherNotes}</Text></View></View> : null}

          <View style={styles.personalNoteCard}>
            <Text style={styles.noteTitle}>Tus notas</Text>
            <Text style={styles.noteText}>Guarda tus cambios, sustituciones o recuerdos de esta receta.</Text>
            <TextInput value={personalNotes} onChangeText={(value) => { setPersonalNotes(value); setNotesSaved(false); }} multiline maxLength={5000} placeholder="¿Qué quieres recordar la próxima vez?" placeholderTextColor={colors.secondaryText} style={styles.personalNoteInput} />
            <Pressable accessibilityRole="button" onPress={() => { void savePersonalNotes(); }} disabled={notesSaved} style={[styles.saveNoteButton, notesSaved && styles.savedNoteButton]}>
              <Text style={styles.saveNoteText}>{notesSaved ? 'Notas guardadas' : 'Guardar nota'}</Text>
            </Pressable>
          </View>

          <Pressable onPress={removeRecipe} style={styles.deleteButton}><Text style={styles.deleteText}>Eliminar receta</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaCell({ icon, iosIcon, value, label }: { icon: string; iosIcon: string; value: string; label: string }) {
  return <View style={styles.metaCell}><SymbolView name={{ android: icon as never, ios: iosIcon as never, web: icon as never }} tintColor={colors.greenDark} size={19} /><Text style={styles.metaValue}>{value}</Text><Text style={styles.metaLabel}>{label}</Text></View>;
}

function seasonTone(season: string): string {
  if (season === 'Verano') return '#F2D6BD';
  if (season === 'Otoño') return '#EBC7A6';
  if (season === 'Invierno') return '#DCE7DD';
  return colors.greenLight;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background }, loadingText: { color: colors.secondaryText, fontSize: 14, textAlign: 'center' },
  safe: { flex: 1, backgroundColor: colors.greenDark }, content: { backgroundColor: colors.background, paddingBottom: 34 },
  hero: { height: 294, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(27,45,24,0.08)' },
  heroPlaceholder: { alignItems: 'center', gap: 10 }, heroPlaceholderText: { color: '#755B42', fontSize: 13, fontWeight: '600' }, heroActions: { position: 'absolute', top: 16, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' }, actionGroup: { flexDirection: 'row', gap: 9 },
  heroButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.cream }, heroTag: { position: 'absolute', left: 22, bottom: 32, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: colors.cream }, heroTagText: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  recipeBody: { marginTop: -20, paddingTop: 26, paddingHorizontal: 22, borderTopLeftRadius: 27, borderTopRightRadius: 27, backgroundColor: colors.background }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, eyebrow: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 }, title: { marginTop: 7, color: colors.text, fontFamily: 'serif', fontSize: 30, fontWeight: '700', lineHeight: 36 }, subtitle: { marginTop: 5, color: colors.secondaryText, fontSize: 13, lineHeight: 19 }, error: { marginTop: 12, color: '#994D43', fontSize: 12 },
  meta: { marginTop: 22, minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: radii.md, backgroundColor: colors.greenLight }, metaCell: { flex: 1, alignItems: 'center', gap: 3 }, metaValue: { color: colors.greenDark, fontSize: 12, fontWeight: '700' }, metaLabel: { color: colors.secondaryText, fontSize: 10 }, divider: { width: 1, height: 39, backgroundColor: '#CBDDBD' }, servingsCell: { flex: 1, alignItems: 'center', gap: 5 }, stepper: { flexDirection: 'row', alignItems: 'center', gap: 7 }, step: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, stepText: { color: colors.greenDark, fontSize: 14, fontWeight: '700', lineHeight: 18 }, servingCount: { minWidth: 15, color: colors.greenDark, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  section: { marginTop: 29 }, ingredient: { minHeight: 47, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#EAE5DA' }, checkbox: { width: 19, height: 19, borderRadius: 7, borderWidth: 1.5, borderColor: '#C7C4B8', alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: colors.green, borderColor: colors.green }, ingredientCopy: { flex: 1 }, ingredientName: { color: colors.text, fontSize: 13 }, crossed: { color: colors.secondaryText, textDecorationLine: 'line-through' }, optional: { marginTop: 2, color: colors.secondaryText, fontSize: 10 }, amount: { color: colors.secondaryText, fontSize: 12 },
  cookButton: { marginTop: 20, minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: radii.pill, backgroundColor: colors.greenDark }, cookButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  designButton: { alignSelf: 'center', minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, marginTop: 8, borderRadius: radii.pill, backgroundColor: colors.greenLight }, designButtonText: { color: colors.greenDark, fontSize: 10, fontWeight: '700' },
  description: { color: '#68685D', fontSize: 14, lineHeight: 23 }, stepBlock: { marginBottom: 15 }, stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }, stepNumber: { width: 31, height: 31, borderRadius: 11, backgroundColor: colors.butter, alignItems: 'center', justifyContent: 'center' }, stepNumberText: { color: colors.greenDark, fontSize: 10, fontWeight: '800' }, stepCopy: { flex: 1, paddingTop: 3, gap: 4 }, stepTitle: { color: colors.text, fontSize: 13, fontWeight: '700' }, stepDescription: { color: colors.text, fontSize: 13, lineHeight: 20 },
  noteCard: { marginTop: 29, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderRadius: radii.md, backgroundColor: '#F8EDD1' }, noteIcon: { width: 35, height: 35, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }, noteTitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 4 }, noteText: { color: '#77705E', fontSize: 12, lineHeight: 19 }, deleteButton: { alignSelf: 'center', marginTop: 26, paddingHorizontal: 18, paddingVertical: 10 }, deleteText: { color: '#AD5B52', fontSize: 12, fontWeight: '700' },
  personalNoteCard: { marginTop: 27, padding: 16, borderRadius: radii.md, backgroundColor: colors.white, gap: 8 }, personalNoteInput: { minHeight: 90, padding: 12, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 13, lineHeight: 19, textAlignVertical: 'top' }, saveNoteButton: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: colors.greenDark }, savedNoteButton: { backgroundColor: colors.greenLight }, saveNoteText: { color: colors.greenDark, fontSize: 11, fontWeight: '700' },
});
