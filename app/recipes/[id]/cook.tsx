import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { TimerCard } from '@/components/TimerCard';
import { colors, radii } from '@/constants/theme';
import { formatQuantity, scaleQuantity } from '@/features/recipes/portion-scaling';
import { useRecipeRepository } from '@/hooks/useRecipeRepository';
import type { Recipe } from '@/types/recipe';

export default function CookingModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repository = useRecipeRepository();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    repository.getById(id).then((item) => {
      if (!active) return;
      if (!item) setError('No se encontró esta receta.');
      else setRecipe(item);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudo abrir el modo de cocina.');
    });
    return () => { active = false; };
  }, [id, repository]);

  if (!recipe) return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.greenDark} /><Text style={styles.loadingText}>{error || 'Preparando la receta…'}</Text></SafeAreaView>;

  const step = recipe.steps[stepIndex];
  if (!step) return <SafeAreaView style={styles.loading}><Text style={styles.loadingText}>Esta receta aún no tiene pasos.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Salir del modo de cocina" onPress={() => router.back()} style={styles.iconButton}>
          <SymbolView name={{ android: 'close', ios: 'xmark', web: 'close' }} tintColor={colors.text} size={19} />
        </Pressable>
        <View style={styles.topCopy}><Text style={styles.kicker}>MODO DE COCINA</Text><Text numberOfLines={1} style={styles.recipeName}>{recipe.title}</Text></View>
        <Text style={styles.counter}>{stepIndex + 1}/{recipe.steps.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressTrack}><View style={[styles.progress, { width: `${((stepIndex + 1) / recipe.steps.length) * 100}%` }]} /></View>
        <Text style={styles.stepLabel}>PASO {String(step.number).padStart(2, '0')}</Text>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDescription}>{step.description}</Text>

        {step.timerMinutes ? <TimerCard recipeId={recipe.id} stepId={step.id} title={step.title} minutes={step.timerMinutes} /> : null}

        <View style={styles.ingredientsCard}>
          <Text style={styles.ingredientsTitle}>A mano para esta receta</Text>
          {recipe.ingredients.map((ingredient) => {
            const amount = scaleQuantity(ingredient.quantity, recipe.baseServings, recipe.baseServings);
            const quantity = amount === null ? ingredient.unit === 'al gusto' ? 'al gusto' : '' : `${formatQuantity(amount)}${ingredient.unit ? ` ${ingredient.unit}` : ''}`;
            return <View key={ingredient.id} style={styles.ingredientRow}><Text style={styles.ingredientName}>{ingredient.name}{ingredient.optional ? ' · opcional' : ''}</Text><Text style={styles.ingredientAmount}>{quantity}</Text></View>;
          })}
        </View>

        {stepIndex === recipe.steps.length - 1 ? (
          <View style={styles.finishMessage}><Image source={require('../../../assets/images/fern-mouse.png')} style={styles.mouse} resizeMode="contain" /><Text style={styles.finishText}>Ya casi está. Disfruta el momento y buen provecho.</Text></View>
        ) : null}
      </ScrollView>

      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" disabled={stepIndex === 0} onPress={() => setStepIndex((current) => Math.max(0, current - 1))} style={[styles.navButton, styles.previous, stepIndex === 0 && styles.disabled]}>
          <SymbolView name={{ android: 'arrow_back', ios: 'arrow.left', web: 'arrow_back' }} tintColor={colors.greenDark} size={17} /><Text style={styles.previousText}>Anterior</Text>
        </Pressable>
        {stepIndex < recipe.steps.length - 1 ? (
          <Pressable accessibilityRole="button" onPress={() => setStepIndex((current) => Math.min(recipe.steps.length - 1, current + 1))} style={[styles.navButton, styles.next]}>
            <Text style={styles.nextText}>Siguiente</Text><SymbolView name={{ android: 'arrow_forward', ios: 'arrow.right', web: 'arrow_forward' }} tintColor={colors.white} size={17} />
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.navButton, styles.next]}><Text style={styles.nextText}>Terminar</Text></Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.background }, loadingText: { color: colors.secondaryText, fontSize: 13 },
  topBar: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.border }, iconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.white },
  topCopy: { flex: 1, gap: 3 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 1 }, recipeName: { color: colors.text, fontSize: 13, fontWeight: '700' }, counter: { color: colors.secondaryText, fontSize: 12, fontWeight: '700' },
  content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 25 }, progressTrack: { height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: colors.greenLight, marginBottom: 28 }, progress: { height: 5, borderRadius: 3, backgroundColor: colors.green },
  stepLabel: { color: colors.greenDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, stepTitle: { marginTop: 8, color: colors.text, fontFamily: 'serif', fontSize: 31, fontWeight: '700', lineHeight: 37 }, stepDescription: { marginTop: 13, marginBottom: 24, color: colors.text, fontSize: 17, lineHeight: 27 },
  ingredientsCard: { marginTop: 23, padding: 16, borderRadius: radii.md, backgroundColor: colors.white }, ingredientsTitle: { marginBottom: 8, color: colors.greenDark, fontSize: 13, fontWeight: '700' }, ingredientRow: { minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F0ECE3' }, ingredientName: { flex: 1, color: colors.text, fontSize: 12 }, ingredientAmount: { color: colors.secondaryText, fontSize: 11 },
  finishMessage: { marginTop: 21, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: radii.sm, backgroundColor: colors.greenLight }, mouse: { width: 42, height: 42 }, finishText: { flex: 1, color: colors.greenDark, fontSize: 12, lineHeight: 18 },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingTop: 11, paddingBottom: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }, navButton: { minHeight: 47, minWidth: 118, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 17, borderRadius: radii.pill }, previous: { backgroundColor: colors.greenLight }, previousText: { color: colors.greenDark, fontSize: 12, fontWeight: '700' }, next: { marginLeft: 'auto', backgroundColor: colors.greenDark }, nextText: { color: colors.white, fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.4 },
});
