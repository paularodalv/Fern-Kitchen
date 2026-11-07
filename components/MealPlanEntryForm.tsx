import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, radii } from '@/constants/theme';
import { addDays, formatDate } from '@/features/meal-planner/calendar';
import { useRecipeRepository } from '@/hooks/useRecipeRepository';
import type { MealPlanEntryFields, MealType, PlannedMeal } from '@/types/meal-planner';
import type { RecipeSummary } from '@/types/recipe';

export const mealTypeOptions: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Desayuno', icon: 'coffee' },
  { type: 'lunch', label: 'Comida', icon: 'lunch_dining' },
  { type: 'snack', label: 'Merienda', icon: 'bakery_dining' },
  { type: 'dinner', label: 'Cena', icon: 'dinner_dining' },
];

type MealPlanEntryFormProps = {
  visible: boolean;
  date: string;
  mealType: MealType;
  initialEntry?: PlannedMeal | null;
  onCancel: () => void;
  onSave: (fields: MealPlanEntryFields) => Promise<void>;
};

export function MealPlanEntryForm({ visible, date: initialDate, mealType: initialMealType, initialEntry, onCancel, onSave }: MealPlanEntryFormProps) {
  const recipeRepository = useRecipeRepository();
  const [date, setDate] = useState(initialEntry?.date ?? initialDate);
  const [mealType, setMealType] = useState(initialEntry?.mealType ?? initialMealType);
  const [entryKind, setEntryKind] = useState(initialEntry?.entryKind ?? 'recipe');
  const [recipeId, setRecipeId] = useState(initialEntry?.recipeId ?? null);
  const [customMealName, setCustomMealName] = useState(initialEntry?.customMealName ?? '');
  const [customMealDescription, setCustomMealDescription] = useState(initialEntry?.customMealDescription ?? '');
  const [servings, setServings] = useState(initialEntry?.servings ?? 2);
  const [notes, setNotes] = useState(initialEntry?.notes ?? '');
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || entryKind !== 'recipe') return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) setLoadingRecipes(true);
      return recipeRepository.list({ search: query });
    }).then((results) => {
      if (active) setRecipes(results);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las recetas.');
    }).finally(() => { if (active) setLoadingRecipes(false); });
    return () => { active = false; };
  }, [entryKind, query, recipeRepository, visible]);

  const selectedRecipe = useMemo(() => recipes.find((recipe) => recipe.id === recipeId) ?? null, [recipeId, recipes]);

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      await onSave({
        date,
        mealType,
        entryKind,
        recipeId: entryKind === 'recipe' ? recipeId : null,
        customMealName: entryKind === 'custom' ? customMealName : null,
        customMealDescription: entryKind === 'custom' ? customMealDescription : null,
        servings,
        notes,
        userId: initialEntry?.userId ?? null,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la comida.');
    } finally {
      setSaving(false);
    }
  };

  const selectRecipe = (recipe: RecipeSummary) => {
    setRecipeId(recipe.id);
    setServings(recipe.baseServings);
    setQuery('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={styles.safe}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onCancel} style={styles.closeButton}><SymbolView name={{ android: 'close', ios: 'xmark', web: 'close' }} tintColor={colors.text} size={19} /></Pressable>
          <Text style={styles.headerTitle}>{initialEntry ? 'Editar comida' : 'Planificar una comida'}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.fieldLabel}>Día</Text>
          <View style={styles.dateControl}>
            <Pressable accessibilityRole="button" accessibilityLabel="Día anterior" onPress={() => setDate((current) => addDays(current, -1))} style={styles.dayArrow}><SymbolView name={{ android: 'chevron_left', ios: 'chevron.left', web: 'chevron_left' }} tintColor={colors.greenDark} size={19} /></Pressable>
            <Text style={styles.dateText}>{formatDate(date)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Día siguiente" onPress={() => setDate((current) => addDays(current, 1))} style={styles.dayArrow}><SymbolView name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }} tintColor={colors.greenDark} size={19} /></Pressable>
          </View>

          <Text style={styles.fieldLabel}>Momento del día</Text>
          <View style={styles.mealTypes}>
            {mealTypeOptions.map((option) => <Pressable key={option.type} onPress={() => setMealType(option.type)} style={[styles.mealTypeChip, mealType === option.type && styles.mealTypeChipActive]}><Text style={[styles.mealTypeText, mealType === option.type && styles.mealTypeTextActive]}>{option.label}</Text></Pressable>)}
          </View>

          <View style={styles.kindSelector}>
            <KindButton label="Elegir receta" selected={entryKind === 'recipe'} onPress={() => setEntryKind('recipe')} />
            <KindButton label="Comida libre" selected={entryKind === 'custom'} onPress={() => setEntryKind('custom')} />
          </View>

          {entryKind === 'recipe' ? (
            <View style={styles.recipePicker}>
              <Text style={styles.fieldLabel}>Receta guardada</Text>
              {selectedRecipe ? (
                <View style={styles.selectedRecipe}>
                  <RecipeArtwork recipe={selectedRecipe} />
                  <View style={styles.recipeCopy}><Text numberOfLines={1} style={styles.recipeTitle}>{selectedRecipe.title}</Text><Text style={styles.recipeSubtitle}>{selectedRecipe.totalMinutes} min · {selectedRecipe.category}</Text></View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Cambiar receta" onPress={() => setRecipeId(null)} style={styles.changeRecipe}><Text style={styles.changeRecipeText}>Cambiar</Text></Pressable>
                </View>
              ) : (
                <>
                  {initialEntry?.entryKind === 'recipe' && initialEntry.recipeId === null ? <Text style={styles.missingRecipe}>La receta vinculada ya no está disponible. Elige otra receta o crea una comida libre.</Text> : null}
                  <View style={styles.searchBox}><SymbolView name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }} tintColor={colors.secondaryText} size={17} /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar en tu cuaderno" placeholderTextColor={colors.secondaryText} style={styles.searchInput} /></View>
                  {loadingRecipes ? <ActivityIndicator style={styles.recipeLoader} color={colors.greenDark} /> : recipes.length ? recipes.slice(0, 8).map((recipe) => <Pressable key={recipe.id} onPress={() => selectRecipe(recipe)} style={styles.recipeOption}><RecipeArtwork recipe={recipe} /><View style={styles.recipeCopy}><Text numberOfLines={1} style={styles.recipeTitle}>{recipe.title}</Text><Text style={styles.recipeSubtitle}>{recipe.totalMinutes} min · {recipe.category}</Text></View><SymbolView name={{ android: 'add_circle_outline', ios: 'plus.circle', web: 'add_circle_outline' }} tintColor={colors.greenDark} size={20} /></Pressable>) : <Text style={styles.noRecipes}>{query ? 'No encontramos recetas con ese nombre.' : 'Aún no hay recetas en tu cuaderno.'}</Text>}
                </>
              )}
            </View>
          ) : (
            <>
              <Field label="Nombre de la comida *" value={customMealName} onChangeText={setCustomMealName} placeholder="Ej. Ensalada de la huerta" />
              <Field label="Descripción (opcional)" value={customMealDescription} onChangeText={setCustomMealDescription} placeholder="Un detalle que quieras recordar" multiline />
            </>
          )}

          <Text style={styles.fieldLabel}>Raciones</Text>
          <View style={styles.servingsControl}><Text style={styles.servingsHint}>Ajusta la cantidad para esta comida</Text><View style={styles.stepper}><Pressable accessibilityRole="button" accessibilityLabel="Una ración menos" disabled={servings <= 1} onPress={() => setServings((count) => Math.max(1, count - 1))} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.servingsCount}>{servings}</Text><Pressable accessibilityRole="button" accessibilityLabel="Una ración más" disabled={servings >= 100} onPress={() => setServings((count) => Math.min(100, count + 1))} style={styles.stepButton}><Text style={styles.stepText}>+</Text></Pressable></View></View>

          <Field label="Notas opcionales" value={notes} onChangeText={setNotes} placeholder="Añade un apunte para ese día" multiline />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }} style={[styles.saveButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>{initialEntry ? 'Guardar cambios' : 'Añadir al menú'}</Text>}</Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function KindButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.kindButton, selected && styles.kindButtonActive]}><Text style={[styles.kindText, selected && styles.kindTextActive]}>{label}</Text></Pressable>;
}

function RecipeArtwork({ recipe }: { recipe: RecipeSummary }) {
  return recipe.imageLocalUri
    ? <Image source={{ uri: recipe.imageLocalUri }} style={styles.recipeImage} resizeMode="cover" />
    : <View style={styles.recipePlaceholder}><SymbolView name={{ android: 'restaurant', ios: 'fork.knife', web: 'restaurant' }} tintColor={colors.greenDark} size={18} /></View>;
}

function Field({ label, value, onChangeText, placeholder, multiline }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.secondaryText} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multiline]} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 61, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: colors.border }, closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.white }, headerTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, headerSpacer: { width: 38 }, content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 32 },
  fieldLabel: { marginBottom: 8, color: colors.text, fontSize: 12, fontWeight: '700' }, dateControl: { minHeight: 48, marginBottom: 19, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, backgroundColor: colors.white }, dayArrow: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.greenLight }, dateText: { color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' }, mealTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 }, mealTypeChip: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }, mealTypeChipActive: { borderColor: colors.greenDark, backgroundColor: colors.greenDark }, mealTypeText: { color: colors.secondaryText, fontSize: 10, fontWeight: '600' }, mealTypeTextActive: { color: colors.white },
  kindSelector: { flexDirection: 'row', gap: 8, marginBottom: 19, padding: 4, borderRadius: radii.pill, backgroundColor: '#EFEADF' }, kindButton: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill }, kindButtonActive: { backgroundColor: colors.greenLight }, kindText: { color: colors.secondaryText, fontSize: 11, fontWeight: '600' }, kindTextActive: { color: colors.greenDark }, recipePicker: { marginBottom: 17 }, searchBox: { minHeight: 43, marginBottom: 8, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.white }, searchInput: { flex: 1, padding: 0, color: colors.text, fontSize: 12 }, recipeOption: { minHeight: 61, marginBottom: 6, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, backgroundColor: colors.white }, recipeImage: { width: 42, height: 42, borderRadius: 13 }, recipePlaceholder: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.greenLight }, recipeCopy: { flex: 1, gap: 3 }, recipeTitle: { color: colors.text, fontSize: 12, fontWeight: '700' }, recipeSubtitle: { color: colors.secondaryText, fontSize: 10 }, recipeLoader: { marginVertical: 15 }, noRecipes: { paddingVertical: 11, color: colors.secondaryText, fontSize: 11, lineHeight: 17 }, selectedRecipe: { minHeight: 61, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, backgroundColor: colors.greenLight }, changeRecipe: { paddingHorizontal: 8, paddingVertical: 6 }, changeRecipeText: { color: colors.greenDark, fontSize: 10, fontWeight: '700' }, missingRecipe: { marginBottom: 8, color: '#9A624E', fontSize: 11, lineHeight: 17 },
  field: { marginBottom: 15 }, input: { minHeight: 45, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, color: colors.text, fontSize: 12 }, multiline: { minHeight: 74, paddingTop: 11, lineHeight: 18 }, servingsControl: { minHeight: 51, marginBottom: 17, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 13, backgroundColor: colors.white }, servingsHint: { color: colors.secondaryText, fontSize: 10 }, stepper: { flexDirection: 'row', alignItems: 'center', gap: 9 }, stepButton: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.greenLight }, stepText: { color: colors.greenDark, fontSize: 16, fontWeight: '700' }, servingsCount: { minWidth: 16, color: colors.greenDark, textAlign: 'center', fontSize: 13, fontWeight: '700' }, error: { marginBottom: 13, padding: 11, borderRadius: 11, backgroundColor: '#FBE7E2', color: '#994D43', fontSize: 11, lineHeight: 17 }, saveButton: { minHeight: 49, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.greenDark }, saveText: { color: colors.white, fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.65 },
});
