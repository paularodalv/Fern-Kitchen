import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors, radii } from '@/constants/theme';
import type { PatienceLevel, Recipe, RecipeFields, RecipeSeason } from '@/types/recipe';
import { ImageUploadSection } from '@/components/images/ImageUploadSection';

type EditableIngredient = { name: string; quantity: string; unit: string; optional: boolean };
type EditableStep = { title: string; description: string; timerMinutes: string };
type RecipeFormProps = { initialRecipe?: Recipe | null; onSave: (fields: RecipeFields) => Promise<void> };

const seasons: RecipeSeason[] = ['Primavera', 'Verano', 'Otoño', 'Invierno', 'Todo el año'];
const patienceLevels: PatienceLevel[] = ['Baja', 'Media', 'Alta'];

export function RecipeForm({ initialRecipe, onSave }: RecipeFormProps) {
  const [title, setTitle] = useState(initialRecipe?.title ?? '');
  const [description, setDescription] = useState(initialRecipe?.description ?? '');
  const [imageUris, setImageUris] = useState<string[]>(initialRecipe?.imageLocalUri ? [initialRecipe.imageLocalUri] : []);
  const [idealSeason, setIdealSeason] = useState<RecipeSeason>(initialRecipe?.idealSeason ?? 'Todo el año');
  const [category, setCategory] = useState(initialRecipe?.category ?? '');
  const [totalMinutes, setTotalMinutes] = useState(String(initialRecipe?.totalMinutes ?? ''));
  const [patienceLevel, setPatienceLevel] = useState<PatienceLevel>(initialRecipe?.patienceLevel ?? 'Media');
  const [baseServings, setBaseServings] = useState(String(initialRecipe?.baseServings ?? '4'));
  const [grandmotherNotes, setGrandmotherNotes] = useState(initialRecipe?.grandmotherNotes ?? '');
  const [ingredients, setIngredients] = useState<EditableIngredient[]>(initialRecipe?.ingredients.map((item) => ({
    name: item.name, quantity: item.quantity === null ? '' : String(item.quantity), unit: item.unit ?? '', optional: item.optional,
  })) ?? [{ name: '', quantity: '', unit: '', optional: false }]);
  const [steps, setSteps] = useState<EditableStep[]>(initialRecipe?.steps.map((step) => ({
    title: step.title, description: step.description, timerMinutes: step.timerMinutes === null ? '' : String(step.timerMinutes),
  })) ?? [{ title: '', description: '', timerMinutes: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError('');
    const fields: RecipeFields = {
      title,
      description,
      imageLocalUri: imageUris[0] ?? null,
      idealSeason,
      category,
      totalMinutes: Number(totalMinutes),
      patienceLevel,
      baseServings: Number(baseServings),
      grandmotherNotes,
      personalNotes: initialRecipe?.personalNotes ?? '',
      ingredients: ingredients.map((item) => ({
        name: item.name,
        quantity: item.quantity.trim() ? Number(item.quantity.replace(',', '.')) : null,
        unit: item.unit,
        optional: item.optional,
      })),
      steps: steps.map((step) => ({
        title: step.title,
        description: step.description,
        timerMinutes: step.timerMinutes.trim() ? Number(step.timerMinutes) : null,
      })),
    };

    setSaving(true);
    try {
      await onSave(fields);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la receta. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
          <SymbolView name={{ android: 'arrow_back', ios: 'arrow.left', web: 'arrow_back' }} tintColor={colors.text} size={21} />
        </Pressable>
        <Text style={styles.navTitle}>{initialRecipe ? 'Editar receta' : 'Nueva receta'}</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>TU CUADERNO, A TU MANERA</Text>
        <Text style={styles.heading}>{initialRecipe ? 'Unos retoques' : 'Una receta nueva'}</Text>
        <Text style={styles.lede}>Guarda los detalles para volver a cocinarla cuando quieras.</Text>

        <Field label="Nombre de la receta *" value={title} onChangeText={setTitle} placeholder="Ej. Tarta de manzana" />
        <Field label="Descripción" value={description} onChangeText={setDescription} placeholder="¿Qué la hace especial?" multiline />
        <ImageUploadSection category="recipe" title="Foto principal (opcional)" value={imageUris} onChange={setImageUris} />
        <View style={styles.row}>
          <View style={styles.half}><Field label="Categoría *" value={category} onChangeText={setCategory} placeholder="Ej. Horno" /></View>
          <View style={styles.half}><Field label="Tiempo total (min) *" value={totalMinutes} onChangeText={setTotalMinutes} placeholder="35" keyboardType="number-pad" /></View>
        </View>

        <ChoiceGroup label="Estación ideal" values={seasons} selected={idealSeason} onSelect={setIdealSeason} />
        <ChoiceGroup label="Paciencia" values={patienceLevels} selected={patienceLevel} onSelect={setPatienceLevel} />
        <Field label="Porciones base *" value={baseServings} onChangeText={setBaseServings} placeholder="4" keyboardType="number-pad" />

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>Ingredientes *</Text><Text style={styles.sectionHint}>Deja la cantidad vacía si es al gusto.</Text></View>
          <Pressable onPress={() => setIngredients((current) => [...current, { name: '', quantity: '', unit: '', optional: false }])} style={styles.addButton}><Text style={styles.addText}>＋ Añadir</Text></Pressable>
        </View>
        {ingredients.map((item, index) => (
          <View key={`ingredient-${index}`} style={styles.editorCard}>
            <View style={styles.editorHeader}><Text style={styles.editorLabel}>Ingrediente {index + 1}</Text><Pressable accessibilityLabel="Eliminar ingrediente" onPress={() => setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Text style={styles.removeText}>Quitar</Text></Pressable></View>
            <Field label="Nombre *" value={item.name} onChangeText={(value) => setIngredients((current) => updateAt(current, index, { name: value }))} placeholder="Ej. Harina" />
            <View style={styles.row}>
              <View style={styles.half}><Field label="Cantidad" value={item.quantity} onChangeText={(value) => setIngredients((current) => updateAt(current, index, { quantity: value }))} placeholder="200" keyboardType="decimal-pad" /></View>
              <View style={styles.half}><Field label="Unidad" value={item.unit} onChangeText={(value) => setIngredients((current) => updateAt(current, index, { unit: value }))} placeholder="g" /></View>
            </View>
            <Pressable onPress={() => setIngredients((current) => updateAt(current, index, { optional: !item.optional }))} style={styles.optionalRow}>
              <View style={[styles.checkbox, item.optional && styles.checked]}>{item.optional ? <SymbolView name={{ android: 'check', ios: 'checkmark', web: 'check' }} tintColor={colors.white} size={12} /> : null}</View>
              <Text style={styles.optionalText}>Ingrediente opcional</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>Pasos *</Text><Text style={styles.sectionHint}>Puedes añadir un temporizador por paso.</Text></View>
          <Pressable onPress={() => setSteps((current) => [...current, { title: '', description: '', timerMinutes: '' }])} style={styles.addButton}><Text style={styles.addText}>＋ Añadir</Text></Pressable>
        </View>
        {steps.map((step, index) => (
          <View key={`step-${index}`} style={styles.editorCard}>
            <View style={styles.editorHeader}><Text style={styles.editorLabel}>Paso {index + 1}</Text><Pressable accessibilityLabel="Eliminar paso" onPress={() => setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index))}><Text style={styles.removeText}>Quitar</Text></Pressable></View>
            <Field label="Título *" value={step.title} onChangeText={(value) => setSteps((current) => updateAt(current, index, { title: value }))} placeholder="Ej. Precalentar el horno" />
            <Field label="Descripción *" value={step.description} onChangeText={(value) => setSteps((current) => updateAt(current, index, { description: value }))} placeholder="Explica qué hay que hacer" multiline />
            <Field label="Temporizador (min, opcional)" value={step.timerMinutes} onChangeText={(value) => setSteps((current) => updateAt(current, index, { timerMinutes: value }))} placeholder="18" keyboardType="number-pad" />
          </View>
        ))}

        <Field label="Notas de la abuela" value={grandmotherNotes} onChangeText={setGrandmotherNotes} placeholder="Un consejo, una variación o un recuerdo..." multiline />
        {error ? <View accessibilityRole="alert" style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
        <Pressable disabled={saving} onPress={handleSave} style={[styles.saveButton, saving && styles.disabled]}>
          <Text style={styles.saveText}>{saving ? 'Guardando…' : initialRecipe ? 'Guardar cambios' : 'Guardar receta'}</Text>
        </Pressable>
        <View style={{ height: 22 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string;
  multiline?: boolean; keyboardType?: 'default' | 'decimal-pad' | 'number-pad'; autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

function ChoiceGroup<T extends string>({ label, values, selected, onSelect }: {
  label: string; values: T[]; selected: T; onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choices}>
        {values.map((value) => {
          const active = selected === value;
          return <Pressable key={value} onPress={() => onSelect(value)} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{value}</Text></Pressable>;
        })}
      </View>
    </View>
  );
}

function updateAt<T>(items: T[], index: number, update: Partial<T>): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, nav: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.white }, navTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  content: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30 }, eyebrow: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 }, heading: { marginTop: 6, color: colors.text, fontFamily: 'serif', fontSize: 30, fontWeight: '700' }, lede: { marginTop: 5, marginBottom: 23, color: colors.secondaryText, fontSize: 13, lineHeight: 19 },
  field: { marginBottom: 15 }, fieldLabel: { marginBottom: 7, color: colors.text, fontSize: 12, fontWeight: '700' }, input: { minHeight: 46, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, color: colors.text, fontSize: 13 }, multiline: { minHeight: 86, paddingTop: 12, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 12 }, half: { flex: 1 }, choiceGroup: { marginBottom: 16 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, choice: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }, choiceActive: { borderColor: colors.greenDark, backgroundColor: colors.greenDark }, choiceText: { color: colors.secondaryText, fontSize: 11, fontWeight: '600' }, choiceTextActive: { color: colors.white },
  sectionHeading: { marginTop: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: colors.text, fontFamily: 'serif', fontSize: 21, fontWeight: '700' }, sectionHint: { marginTop: 3, color: colors.secondaryText, fontSize: 11 }, addButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.greenLight }, addText: { color: colors.greenDark, fontSize: 11, fontWeight: '700' },
  editorCard: { marginBottom: 11, padding: 13, borderRadius: radii.sm, borderWidth: 1, borderColor: '#EFE9DC', backgroundColor: '#FFFCF6' }, editorHeader: { marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, editorLabel: { color: colors.greenDark, fontSize: 11, fontWeight: '800' }, removeText: { color: '#AD5B52', fontSize: 11, fontWeight: '600' }, optionalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }, checkbox: { width: 18, height: 18, borderWidth: 1.3, borderColor: '#C7C4B8', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: colors.green, borderColor: colors.green }, optionalText: { color: colors.secondaryText, fontSize: 11 },
  error: { padding: 12, borderRadius: 12, backgroundColor: '#FBE7E2', marginBottom: 13 }, errorText: { color: '#994D43', fontSize: 12, lineHeight: 18 }, saveButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.greenDark }, saveText: { color: colors.white, fontSize: 14, fontWeight: '700' }, disabled: { opacity: 0.6 },
});
