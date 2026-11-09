import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { AppHeader } from '@/components/AppHeader';
import { colors, radii } from '@/constants/theme';
import { useBackupRepository } from '@/hooks/useBackupRepository';
import { exportBackup, pickAndValidateBackup } from '@/services/backupFiles';

export default function BackupScreen() {
  const repository = useBackupRepository();
  const [busy, setBusy] = useState(false);
  const runExport = async () => {
    setBusy(true);
    try { await exportBackup(repository); } catch { Alert.alert('No se pudo exportar', 'Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  };
  const runImport = async () => {
    setBusy(true);
    try {
      const backup = await pickAndValidateBackup();
      if (!backup) return;
      Alert.alert('Importar copia', `Se añadirán ${backup.data.recipes.length} recetas y ${backup.data.pantryItems.length} ingredientes. Los elementos con el mismo identificador se omitirán.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Importar', onPress: () => { void (async () => {
          try {
            const result = await repository.importData(backup);
            Alert.alert('Copia importada', `Recetas añadidas: ${result.recipesAdded}\nIngredientes añadidos: ${result.pantryItemsAdded}\nDuplicados omitidos: ${result.duplicatesSkipped}`);
          } catch { Alert.alert('Importación cancelada', 'No se han modificado tus datos. La copia no pudo restaurarse completamente.'); }
          finally { setBusy(false); }
        })(); } },
      ]);
      return;
    } catch (error) { Alert.alert('Copia no válida', error instanceof Error ? error.message : 'No se pudo leer el archivo.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.back()} style={styles.back}><SymbolView name={{ android: 'arrow_back', ios: 'chevron.left', web: 'arrow_back' }} tintColor={colors.greenDark} size={22} /><Text style={styles.backText}>Volver</Text></Pressable>
    <AppHeader />
    <Text style={styles.kicker}>TUS DATOS, CONTIGO</Text><Text style={styles.title}>Copias de seguridad</Text>
    <Text style={styles.description}>Guarda y recupera recetas, favoritos, notas personales y los ingredientes de tu alacena. La copia se conserva donde tú elijas.</Text>
    <View style={styles.note}><Text style={styles.noteText}>Las fotos no se incluyen; se mantienen en este dispositivo. Importar añade elementos y nunca reemplaza los que ya existen.</Text></View>
    <Pressable disabled={busy} onPress={() => void runExport()} style={styles.primary}>{busy ? <ActivityIndicator color={colors.white} /> : <><SymbolView name={{ android: 'file_upload', ios: 'square.and.arrow.up', web: 'file_upload' }} tintColor={colors.white} size={21} /><Text style={styles.primaryText}>Exportar copia</Text></>}</Pressable>
    <Pressable disabled={busy} onPress={() => void runImport()} style={styles.secondary}>{busy ? <ActivityIndicator color={colors.greenDark} /> : <><SymbolView name={{ android: 'file_download', ios: 'square.and.arrow.down', web: 'file_download' }} tintColor={colors.greenDark} size={21} /><Text style={styles.secondaryText}>Importar copia</Text></>}</Pressable>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 22, gap: 17 }, back: { flexDirection: 'row', alignItems: 'center', gap: 7 }, backText: { color: colors.greenDark, fontWeight: '600' }, kicker: { color: colors.greenDark, fontWeight: '800', fontSize: 11, letterSpacing: 1.1, marginTop: 20 }, title: { color: colors.text, fontFamily: 'serif', fontSize: 32, fontWeight: '700', marginTop: -10 }, description: { color: colors.secondaryText, lineHeight: 22 }, note: { padding: 15, borderRadius: radii.md, backgroundColor: colors.greenLight }, noteText: { color: colors.greenDark, lineHeight: 20, fontSize: 13 }, primary: { minHeight: 56, borderRadius: radii.md, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 }, primaryText: { color: colors.white, fontWeight: '700', fontSize: 15 }, secondary: { minHeight: 56, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.greenLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, secondaryText: { color: colors.greenDark, fontWeight: '700', fontSize: 15 } });
