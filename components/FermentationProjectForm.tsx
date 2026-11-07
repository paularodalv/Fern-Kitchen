import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ImageUploadSection } from '@/components/images/ImageUploadSection';
import { colors, radii } from '@/constants/theme';
import { fermentationTemplates } from '@/features/fermentation/catalog';
import type { FermentationIngredient, FermentationProjectInput, FermentationStatus } from '@/types/fermentation';

type Props = { onSave: (input: FermentationProjectInput) => Promise<void>; onCancel: () => void };

export function FermentationProjectForm({ onSave, onCancel }: Props) {
  const [name, setName] = useState('');
  const [fermentationType, setFermentationType] = useState('sourdough');
  const [customTypeName, setCustomTypeName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(localDate());
  const [duration, setDuration] = useState('');
  const [temperatureNotes, setTemperatureNotes] = useState('');
  const [personalNotes, setPersonalNotes] = useState('');
  const [ingredients, setIngredients] = useState<FermentationIngredient[]>([]);
  const [ingredientName, setIngredientName] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState('');
  const [ingredientUnit, setIngredientUnit] = useState('g');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addIngredient = () => {
    if (!ingredientName.trim()) return;
    const quantity = ingredientQuantity.trim() ? Number(ingredientQuantity) : null;
    if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) { setError('Revisa la cantidad del ingrediente.'); return; }
    setIngredients((items) => [...items, { name: ingredientName.trim(), quantity, unit: ingredientUnit.trim() }]);
    setIngredientName('');
    setIngredientQuantity('');
  };

  const save = async () => {
    setError('');
    if (!name.trim()) { setError('Escribe un nombre para el proyecto.'); return; }
    if (fermentationType === 'custom' && !customTypeName.trim()) { setError('Escribe el tipo de fermento personalizado.'); return; }
    if (duration && (!Number.isInteger(Number(duration)) || Number(duration) <= 0)) { setError('La duración debe ser un número de días positivo.'); return; }
    setSaving(true);
    try {
      const status: FermentationStatus = 'active';
      await onSave({
        name, fermentationType, customTypeName: fermentationType === 'custom' ? customTypeName : null,
        description, status, startDate, expectedDurationDays: duration ? Number(duration) : null,
        temperatureNotes, initialPhotoUri: photoUris[0] ?? null, personalNotes, ingredients, userId: null,
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el proyecto.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onCancel} style={styles.back}><SymbolView name={{ android: 'arrow_back', ios: 'arrow.left', web: 'arrow_back' }} tintColor={colors.text} size={20} /></Pressable><Text style={styles.title}>Nuevo fermento</Text><View style={styles.spacer} /></View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Cada cultivo tiene su propio ritmo. Empieza por lo que quieres acompañar.</Text>
        <Field label="Nombre del proyecto" value={name} onChangeText={setName} placeholder="Ej. Mi masa madre de centeno" />
        <Text style={styles.label}>Tipo de fermento</Text>
        <View style={styles.types}>{fermentationTemplates.map((item) => <Pressable key={item.id} onPress={() => setFermentationType(item.id)} style={[styles.typeChip, fermentationType === item.id && styles.typeChipActive]}><Text style={[styles.typeText, fermentationType === item.id && styles.typeTextActive]}>{item.label}</Text></Pressable>)}<Pressable onPress={() => setFermentationType('custom')} style={[styles.typeChip, fermentationType === 'custom' && styles.typeChipActive]}><Text style={[styles.typeText, fermentationType === 'custom' && styles.typeTextActive]}>Personalizado</Text></Pressable></View>
        {fermentationType === 'custom' ? <Field label="Nombre del tipo" value={customTypeName} onChangeText={setCustomTypeName} placeholder="Ej. Tepache" /> : null}
        <Field label="Descripción" value={description} onChangeText={setDescription} placeholder="Una nota sobre este fermento" multiline />
        <View style={styles.row}><Field label="Fecha de inicio" value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-DD" /><Field label="Duración esperada (días)" value={duration} onChangeText={setDuration} placeholder="Opcional" keyboardType="numeric" /></View>
        <Field label="Notas de temperatura" value={temperatureNotes} onChangeText={setTemperatureNotes} placeholder="Ej. Encimera fresca, alrededor de 20 °C" multiline />
        <Text style={styles.label}>Ingredientes iniciales</Text>
        <View style={styles.ingredientRow}><TextInput value={ingredientName} onChangeText={setIngredientName} placeholder="Harina, agua…" placeholderTextColor={colors.secondaryText} style={[styles.input, styles.ingredientName]} /><TextInput value={ingredientQuantity} onChangeText={setIngredientQuantity} placeholder="Cantidad" keyboardType="decimal-pad" placeholderTextColor={colors.secondaryText} style={[styles.input, styles.ingredientAmount]} /><TextInput value={ingredientUnit} onChangeText={setIngredientUnit} placeholder="Unidad" placeholderTextColor={colors.secondaryText} style={[styles.input, styles.ingredientUnit]} /><Pressable accessibilityRole="button" accessibilityLabel="Añadir ingrediente" onPress={addIngredient} style={styles.add}><Text style={styles.addText}>+</Text></Pressable></View>
        {ingredients.map((item, index) => <View key={`${item.name}-${index}`} style={styles.ingredientPill}><Text style={styles.ingredientText}>{item.name}{item.quantity !== null ? ` · ${item.quantity} ${item.unit}` : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${item.name}`} onPress={() => setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Text style={styles.remove}>×</Text></Pressable></View>)}
        <Text style={styles.label}>Foto inicial (opcional)</Text>
        <ImageUploadSection category="fermentation" title="Foto de portada" value={photoUris} onChange={setPhotoUris} />
        <Field label="Notas personales" value={personalNotes} onChangeText={setPersonalNotes} placeholder="Qué quieres recordar…" multiline />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}><Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }} style={[styles.save, saving && styles.disabled]}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Crear proyecto</Text>}</Pressable></View>
        <Text style={styles.safetyNote}>Este espacio recoge tus observaciones personales; el tiempo transcurrido no confirma la seguridad del alimento.</Text>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'numeric' | 'decimal-pad' | 'default' }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.secondaryText} multiline={multiline} keyboardType={keyboardType ?? 'default'} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multiline]} /></View>;
}

function localDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 60, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.white }, title: { color: colors.text, fontFamily: 'serif', fontSize: 21, fontWeight: '700' }, spacer: { width: 38 }, content: { paddingHorizontal: 20, paddingBottom: 36 }, intro: { marginTop: 8, marginBottom: 18, color: colors.secondaryText, fontSize: 12, lineHeight: 18 }, field: { flex: 1, marginBottom: 14 }, label: { marginBottom: 7, color: colors.text, fontSize: 11, fontWeight: '700' }, input: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.white, color: colors.text, fontSize: 12 }, multiline: { minHeight: 76, paddingTop: 10, lineHeight: 18 }, types: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 }, typeChip: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.white }, typeChipActive: { borderColor: colors.greenDark, backgroundColor: colors.greenLight }, typeText: { color: colors.secondaryText, fontSize: 10 }, typeTextActive: { color: colors.greenDark, fontWeight: '700' }, row: { flexDirection: 'row', gap: 10 }, ingredientRow: { flexDirection: 'row', gap: 5, marginBottom: 8 }, ingredientName: { flex: 1 }, ingredientAmount: { width: 75 }, ingredientUnit: { width: 55 }, add: { width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.greenDark }, addText: { color: colors.white, fontSize: 24 }, ingredientPill: { minHeight: 34, marginBottom: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 11, backgroundColor: colors.greenLight }, ingredientText: { color: colors.greenDark, fontSize: 10 }, remove: { color: colors.greenDark, fontSize: 20 }, photoButton: { minHeight: 58, marginBottom: 16, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 15, backgroundColor: colors.white }, photoIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.greenLight }, photoPreview: { width: 54, height: 44, borderRadius: 11 }, photoText: { color: colors.greenDark, fontSize: 11, fontWeight: '600' }, error: { marginBottom: 10, color: '#994D43', fontSize: 11 }, actions: { flexDirection: 'row', gap: 9, marginTop: 5 }, cancel: { minHeight: 47, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.white }, cancelText: { color: colors.secondaryText, fontSize: 12, fontWeight: '600' }, save: { minHeight: 47, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.greenDark }, saveText: { color: colors.white, fontSize: 12, fontWeight: '700' }, disabled: { opacity: 0.6 }, safetyNote: { marginTop: 14, color: colors.secondaryText, fontSize: 9, lineHeight: 14, textAlign: 'center' },
});
