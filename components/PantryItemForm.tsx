import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, radii } from '@/constants/theme';
import type { PantryItem, PantryItemFields } from '@/types/pantry';

type PantryItemFormProps = {
  visible: boolean;
  initialItem?: PantryItem | null;
  onCancel: () => void;
  onSave: (fields: PantryItemFields) => Promise<void>;
};

export function PantryItemForm({ visible, initialItem, onCancel, onSave }: PantryItemFormProps) {
  const [name, setName] = useState(initialItem?.name ?? '');
  const [quantity, setQuantity] = useState(initialItem ? String(initialItem.quantity).replace('.', ',') : '');
  const [unit, setUnit] = useState(initialItem?.unit ?? 'unidad');
  const [purchaseDate, setPurchaseDate] = useState(initialItem?.purchaseDate ?? '');
  const [bestBeforeDate, setBestBeforeDate] = useState(initialItem?.bestBeforeDate ?? '');
  const [category, setCategory] = useState(initialItem?.category ?? 'Despensa');
  const [notes, setNotes] = useState(initialItem?.notes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError('');
    const parsedQuantity = Number(quantity.replace(',', '.'));
    if (!quantity.trim() || !Number.isFinite(parsedQuantity)) {
      setError('Indica una cantidad numérica.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name,
        quantity: parsedQuantity,
        unit,
        purchaseDate: purchaseDate.trim() || null,
        bestBeforeDate: bestBeforeDate.trim() || null,
        category,
        notes,
        userId: initialItem?.userId ?? null,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el ingrediente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={styles.safe}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onCancel} style={styles.closeButton}><SymbolView name={{ android: 'close', ios: 'xmark', web: 'close' }} tintColor={colors.text} size={19} /></Pressable>
          <Text style={styles.headerTitle}>{initialItem ? 'Editar ingrediente' : 'Añadir a la alacena'}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.intro}>Guarda lo que tienes en casa. Esta lista es independiente de los productos de temporada.</Text>
          <Field label="Ingrediente *" value={name} onChangeText={setName} placeholder="Ej. Garbanzos" />
          <View style={styles.row}>
            <View style={styles.half}><Field label="Cantidad *" value={quantity} onChangeText={setQuantity} placeholder="2" keyboardType="decimal-pad" /></View>
            <View style={styles.half}><Field label="Unidad *" value={unit} onChangeText={setUnit} placeholder="botes" /></View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}><Field label="Compra (opcional)" value={purchaseDate} onChangeText={setPurchaseDate} placeholder="AAAA-MM-DD" autoCapitalize="none" /></View>
            <View style={styles.half}><Field label="Consumir antes de" value={bestBeforeDate} onChangeText={setBestBeforeDate} placeholder="AAAA-MM-DD" autoCapitalize="none" /></View>
          </View>
          <Field label="Categoría *" value={category} onChangeText={setCategory} placeholder="Ej. Verdura" />
          <Field label="Notas" value={notes} onChangeText={setNotes} placeholder="Dónde lo guardas o cualquier apunte" multiline />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void save(); }} style={[styles.saveButton, saving && styles.disabled]}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>{initialItem ? 'Guardar cambios' : 'Guardar ingrediente'}</Text>}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string;
  multiline?: boolean; keyboardType?: 'default' | 'decimal-pad'; autoCapitalize?: 'none' | 'sentences';
}) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.secondaryText} multiline={multiline} keyboardType={keyboardType ?? 'default'} autoCapitalize={autoCapitalize ?? 'sentences'} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multiline]} /></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.white }, headerTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, headerSpacer: { width: 38 },
  content: { paddingHorizontal: 22, paddingTop: 19, paddingBottom: 32 }, intro: { marginBottom: 20, color: colors.secondaryText, fontSize: 12, lineHeight: 18 },
  field: { flex: 1, marginBottom: 15 }, fieldLabel: { marginBottom: 7, color: colors.text, fontSize: 12, fontWeight: '700' }, input: { minHeight: 45, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, color: colors.text, fontSize: 13 }, multiline: { minHeight: 82, paddingTop: 11, lineHeight: 19 }, row: { flexDirection: 'row', gap: 12 }, half: { flex: 1 }, error: { marginBottom: 14, padding: 11, borderRadius: 11, backgroundColor: '#FBE7E2', color: '#994D43', fontSize: 12, lineHeight: 17 },
  saveButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.greenDark }, saveText: { color: colors.white, fontSize: 13, fontWeight: '700' }, disabled: { opacity: 0.65 },
});
