import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useImageRepository } from '@/hooks/useImageRepository';
import { deleteImageIfUnused, importImageFile, removeImageFile } from '@/services/ImageStorageService';
import type { AppImage, ImageCategory } from '@/types/image';
import { colors, radii } from '@/constants/theme';

type Props = { category: ImageCategory; value: string[]; onChange: (uris: string[]) => void; multiple?: boolean; maxSelection?: number; title?: string };

export function ImageUploadSection({ category, value, onChange, multiple = false, maxSelection = 10, title = 'Fotografías' }: Props) {
  const repository = useImageRepository();
  const [pending, setPending] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [library, setLibrary] = useState<AppImage[]>([]);
  const [pendingLibrary, setPendingLibrary] = useState<AppImage[]>([]);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const choose = async (source: 'gallery' | 'camera') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert('Permiso necesario', 'Para hacer una foto, permite el acceso a la cámara en los ajustes de Android.'); return; }
      }
      const result = source === 'gallery'
        ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: multiple, selectionLimit: multiple ? Math.max(1, maxSelection - value.length) : 1, quality: 1 })
        : await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      if (!result.canceled) { setPendingLibrary([]); setPending(result.assets.slice(0, multiple ? Math.max(1, maxSelection - value.length) : 1)); }
    } catch { Alert.alert('No se pudo abrir la cámara o galería', 'Comprueba los permisos y vuelve a intentarlo.'); }
  };

  const openLibrary = async () => {
    try {
      const stored = await repository.list();
      if (!stored.length) { Alert.alert('Biblioteca vacía', 'Las fotografías guardadas aparecerán aquí para volver a utilizarlas.'); return; }
      setPending([]); setPendingLibrary([]); setLibrary(stored); setLibraryVisible(true);
    } catch { Alert.alert('No se pudo abrir la biblioteca', 'Inténtalo de nuevo.'); }
  };

  const openOptions = () => Alert.alert(value.length ? 'Gestionar fotografías' : 'Añadir foto', undefined, [
    { text: value.length ? 'Cambiar foto' : 'Elegir de la galería', onPress: () => { void choose('gallery'); } },
    { text: 'Usar una foto guardada', onPress: () => { void openLibrary(); } },
    { text: 'Hacer una foto', onPress: () => { void choose('camera'); } },
    { text: 'Cancelar', style: 'cancel' },
  ]);

  const confirm = async () => {
    setSaving(true);
    try {
      const imported: AppImage[] = [...pendingLibrary];
      for (const asset of pending) {
        const file = await importImageFile({ uri: asset.uri, filename: asset.fileName, mimeType: asset.mimeType, width: asset.width, height: asset.height, category });
        try { imported.push(await repository.register(file)); }
        catch (cause) { await removeImageFile(file.localUri); throw cause; }
      }
      const next = multiple ? [...value, ...imported.map((image) => image.localUri)].slice(0, maxSelection) : imported.map((image) => image.localUri);
      onChange(next);
      setPending([]);
      setPendingLibrary([]);
    } catch (cause) { Alert.alert('No se pudo guardar la foto', cause instanceof Error ? cause.message : 'Comprueba el espacio disponible e inténtalo de nuevo.'); }
    finally { setSaving(false); }
  };

  const remove = (uri: string) => Alert.alert('Eliminar fotografía', 'Se quitará de este elemento. La imagen se conservará en la biblioteca local.', [
    { text: 'Cancelar', style: 'cancel' }, { text: 'Quitar', style: 'destructive', onPress: () => onChange(value.filter((item) => item !== uri)) },
  ]);

  return <View style={styles.container}>
    <Text style={styles.heading}>{title}</Text>
    {value.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
      {value.map((uri) => <View key={uri} style={styles.tile}>
        <Pressable accessibilityLabel="Ver fotografía" onPress={() => setViewerUri(uri)}><Image source={{ uri }} style={styles.image} onError={() => Alert.alert('Fotografía no disponible', 'El archivo no se encuentra en el almacenamiento local.')} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Eliminar foto" onPress={() => remove(uri)} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable>
      </View>)}
    </ScrollView> : <Text style={styles.helper}>Las fotos se guardan en este dispositivo y estarán disponibles sin conexión.</Text>}
    {(!value.length || multiple) ? <ImagePickerButton onPress={openOptions} label={value.length ? '＋ Añadir foto' : 'Añadir foto'} /> : <ImagePickerButton onPress={openOptions} label="Cambiar foto" />}
    <Modal visible={pending.length > 0 || pendingLibrary.length > 0} transparent animationType="fade" onRequestClose={() => { setPending([]); setPendingLibrary([]); }}>
      <View style={styles.backdrop}><View style={styles.modal}>
        <Text style={styles.modalTitle}>Vista previa</Text><Text style={styles.helper}>{pending.length + pendingLibrary.length === 1 ? 'Confirma la fotografía seleccionada.' : `Se añadirán ${pending.length + pendingLibrary.length} fotografías.`}</Text>
        <ScrollView horizontal contentContainerStyle={styles.gallery}>{pendingLibrary.map((item) => <Image key={item.id} source={{ uri: item.localUri }} style={styles.preview} />)}{pending.map((asset) => <Image key={asset.assetId ?? asset.uri} source={{ uri: asset.uri }} style={styles.preview} />)}</ScrollView>
        <View style={styles.actions}><Pressable disabled={saving} onPress={() => { setPending([]); setPendingLibrary([]); }} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable><Pressable disabled={saving} onPress={() => { void confirm(); }} style={styles.save}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Guardar</Text>}</Pressable></View>
      </View></View>
    </Modal>
    <Modal visible={libraryVisible} transparent animationType="fade" onRequestClose={() => setLibraryVisible(false)}>
      <View style={styles.backdrop}><View style={styles.libraryModal}><Text style={styles.modalTitle}>Biblioteca local</Text><Text style={styles.helper}>Elige fotos ya guardadas para no duplicar archivos. Mantén pulsada una foto para ver las opciones de limpieza.</Text><ScrollView contentContainerStyle={styles.libraryGrid}>{library.map((item) => { const selected = pendingLibrary.some((chosen) => chosen.id === item.id); return <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onLongPress={() => { void repository.isReferenced(item.id).then((referenced) => Alert.alert(referenced ? 'Foto en uso' : 'Eliminar de la biblioteca', referenced ? 'Quita primero todas las asociaciones para poder borrar este archivo.' : 'Se eliminarán el archivo y sus datos locales.', [{ text: 'Cancelar', style: 'cancel' }, ...(!referenced ? [{ text: 'Eliminar', style: 'destructive' as const, onPress: () => { void deleteImageIfUnused(repository, item.id).then(() => setLibrary((items) => items.filter((photo) => photo.id !== item.id))).catch(() => Alert.alert('No se pudo eliminar', 'La fotografía sigue guardada en el dispositivo.')); } }] : [])])); }} onPress={() => setPendingLibrary((current) => selected ? current.filter((chosen) => chosen.id !== item.id) : multiple ? current.length < Math.max(0, maxSelection - value.length) ? [...current, item] : current : [item])} style={[styles.libraryItem, selected && styles.librarySelected]}><Image source={{ uri: item.localUri }} style={styles.libraryImage} /><Text numberOfLines={1} style={styles.libraryName}>{item.originalFilename}</Text></Pressable>; })}</ScrollView><View style={styles.actions}><Pressable onPress={() => { setLibraryVisible(false); setPendingLibrary([]); }} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable><Pressable onPress={() => setLibraryVisible(false)} style={styles.save}><Text style={styles.saveText}>Usar selección</Text></Pressable></View></View></View>
    </Modal>
    <Modal visible={viewerUri !== null} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
      <Pressable style={styles.viewer} onPress={() => setViewerUri(null)}><Image source={{ uri: viewerUri ?? '' }} resizeMode="contain" style={styles.viewerImage} /><Text style={styles.viewerHint}>Toca para cerrar</Text></Pressable>
    </Modal>
  </View>;
}

export function ImagePickerButton({ onPress, label = 'Añadir foto' }: { onPress: () => void; label?: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}><Text style={styles.buttonText}>＋ {label.replace(/^＋\s*/, '')}</Text></Pressable>;
}

export function ImagePreview({ uri, onPress }: { uri: string; onPress?: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="image"><Image source={{ uri }} style={styles.image} /></Pressable>;
}

export function ImageThumbnail({ uri, size = 72 }: { uri: string; size?: number }) {
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 12, backgroundColor: colors.greenLight }} />;
}

export function ImageGallery({ uris, onPress }: { uris: string[]; onPress?: (uri: string) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>{uris.map((uri) => <Pressable key={uri} onPress={() => onPress?.(uri)}><ImageThumbnail uri={uri} /></Pressable>)}</ScrollView>;
}

export function ImageViewer({ uri, visible, onClose }: { uri: string | null; visible: boolean; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.viewer} onPress={onClose}>{uri ? <Image source={{ uri }} resizeMode="contain" style={styles.viewerImage} /> : null}<Text style={styles.viewerHint}>Toca para cerrar</Text></Pressable></Modal>;
}

const styles = StyleSheet.create({
  container: { marginBottom: 18, padding: 14, borderRadius: radii.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  heading: { marginBottom: 6, color: colors.text, fontSize: 14, fontWeight: '700' }, helper: { color: colors.secondaryText, fontSize: 12, lineHeight: 18 }, gallery: { gap: 10, paddingVertical: 8 }, tile: { position: 'relative' }, image: { width: 96, height: 84, borderRadius: 12, backgroundColor: colors.greenLight }, remove: { position: 'absolute', right: 4, top: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, removeText: { color: '#AD5B52', fontSize: 18, lineHeight: 21 }, button: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill, backgroundColor: colors.greenLight }, buttonText: { color: colors.greenDark, fontSize: 12, fontWeight: '700' }, backdrop: { flex: 1, padding: 22, justifyContent: 'center', backgroundColor: '#1A1B1888' }, modal: { padding: 18, borderRadius: radii.md, backgroundColor: colors.background }, libraryModal: { maxHeight: '82%', padding: 18, borderRadius: radii.md, backgroundColor: colors.background }, libraryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 }, libraryItem: { width: '31%', padding: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white }, librarySelected: { borderWidth: 2, borderColor: colors.green }, libraryImage: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: colors.greenLight }, libraryName: { marginTop: 5, color: colors.text, fontSize: 9 }, modalTitle: { color: colors.text, fontSize: 19, fontWeight: '700' }, preview: { width: 150, height: 150, borderRadius: 16, backgroundColor: colors.greenLight }, actions: { flexDirection: 'row', gap: 10, marginTop: 12 }, cancel: { flex: 1, minHeight: 46, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }, cancelText: { color: colors.text, fontWeight: '600' }, save: { flex: 1, minHeight: 46, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenDark }, saveText: { color: colors.white, fontWeight: '700' }, viewer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#111B' }, viewerImage: { width: '100%', height: '82%' }, viewerHint: { marginTop: 10, color: colors.white, fontSize: 12 },
});
