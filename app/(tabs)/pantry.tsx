import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { AppHeader } from '@/components/AppHeader';
import { PantryItemForm } from '@/components/PantryItemForm';
import { colors, radii } from '@/constants/theme';
import { seasons } from '@/features/pantry/seasonal-data';
import { usePantryRepository } from '@/hooks/usePantryRepository';
import { useSeasonalProductRepository } from '@/hooks/useSeasonalProductRepository';
import { useImageRepository } from '@/hooks/useImageRepository';
import type { PantryItem, Season, SeasonalProduct } from '@/types/pantry';

type PantryView = 'home' | 'seasonal';
const categoryTones: Record<string, string> = { Fruta: colors.peach, Verdura: colors.greenLight, Despensa: colors.butter, Lácteos: '#F4E7BE', Otros: '#E8E5D8', Setas: '#E8D5C5' };

export default function PantryScreen() {
  const pantryRepository = usePantryRepository();
  const seasonalRepository = useSeasonalProductRepository();
  const imageRepository = useImageRepository();
  const [view, setView] = useState<PantryView>('home');
  const [items, setItems] = useState<PantryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState<Season>(currentSeason());
  const [seasonalProducts, setSeasonalProducts] = useState<SeasonalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      if (view === 'home') {
        const [nextItems, nextCategories, nextTotal] = await Promise.all([
          pantryRepository.list({ category, search }),
          pantryRepository.listCategories(),
          pantryRepository.count(),
        ]);
        setItems(nextItems);
        setCategories(nextCategories);
        setTotalCount(nextTotal);
      } else {
        setSeasonalProducts(await seasonalRepository.list(season));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la alacena.');
    } finally {
      setLoading(false);
    }
  }, [category, pantryRepository, search, season, seasonalRepository, view]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openNewItem = () => { setEditingItem(null); setFormVisible(true); };
  const openEditItem = (item: PantryItem) => { setEditingItem(item); setFormVisible(true); };
  const saveItem = async (fields: Parameters<typeof pantryRepository.create>[0]) => {
    const item = editingItem ? await pantryRepository.update(editingItem.id, fields) : await pantryRepository.create(fields);
    const image = fields.imageLocalUri ? await imageRepository.getByUri(fields.imageLocalUri) : null;
    await imageRepository.replaceAssociation(image?.id ?? null, 'pantry', item.id, 'ingredient');
    setFormVisible(false);
    await load();
  };

  const confirmDelete = (item: PantryItem) => Alert.alert('Quitar de la alacena', `¿Quieres eliminar ${item.name}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => {
      void pantryRepository.delete(item.id).then(load).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el ingrediente.');
      });
    } },
  ]);

  const selectView = (nextView: PantryView) => {
    setView(nextView);
    setError('');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><AppHeader onProfilePress={() => router.push('/kitchen')} /></View>
        <Text style={styles.eyebrow}>TU COCINA, EN SU PUNTO</Text>
        <Text style={styles.pageTitle}>La alacena</Text>
        <Text style={styles.lede}>Lo que guardas en casa y lo que ofrece cada estación.</Text>

        <View style={styles.segment} accessibilityRole="tablist">
          <Segment label="En casa" description="Tu despensa" icon="inventory_2" selected={view === 'home'} onPress={() => selectView('home')} />
          <Segment label="De temporada" description="El calendario natural" icon="eco" selected={view === 'seasonal'} onPress={() => selectView('seasonal')} />
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {view === 'home' ? (
          <>
            <View style={styles.homeSummary}>
              <View style={styles.summaryIcon}><SymbolView name={{ android: 'kitchen', ios: 'cabinet', web: 'kitchen' }} tintColor={colors.greenDark} size={22} /></View>
              <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>{totalCount} {totalCount === 1 ? 'ingrediente' : 'ingredientes'} guardados</Text><Text style={styles.summarySub}>{items.length === totalCount ? 'Tu lista privada de lo que tienes a mano' : `${items.length} resultados con este filtro`}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Añadir ingrediente" onPress={openNewItem} style={styles.addButton}><SymbolView name={{ android: 'add', ios: 'plus', web: 'add' }} tintColor={colors.white} size={22} /></Pressable>
            </View>
            <View style={styles.searchBox}>
              <SymbolView name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }} tintColor={colors.secondaryText} size={17} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Buscar en casa" placeholderTextColor={colors.secondaryText} style={styles.searchInput} returnKeyType="search" />
              {search ? <Pressable accessibilityLabel="Borrar búsqueda" onPress={() => setSearch('')}><SymbolView name={{ android: 'close', ios: 'xmark.circle.fill', web: 'close' }} tintColor={colors.secondaryText} size={17} /></Pressable> : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {[{ title: 'Todo', count: null }, ...categories.map((title) => ({ title, count: null }))].map(({ title }) => (
                <Chip key={title} label={title} selected={title === 'Todo' ? category === null : category === title} onPress={() => setCategory(title === 'Todo' ? null : title)} />
              ))}
            </ScrollView>

            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Lo que tienes</Text><Text style={styles.sectionCaption}>Cantidades y fechas de tu despensa</Text></View>
            {loading ? <View style={styles.loading}><ActivityIndicator color={colors.greenDark} /></View> : items.length ? items.map((item) => <PantryItemCard key={item.id} item={item} onEdit={() => openEditItem(item)} onDelete={() => confirmDelete(item)} />) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}><SymbolView name={{ android: 'shelves', ios: 'cabinet', web: 'shelves' }} tintColor={colors.greenDark} size={26} /></View>
                <Text style={styles.emptyTitle}>{search ? 'No encontramos ese ingrediente' : 'Tu despensa empieza aquí'}</Text>
                <Text style={styles.emptyCopy}>{search ? 'Prueba otro nombre o quita el filtro.' : 'Añade lo que tienes guardado. Los productos de temporada aparecen en otra pestaña.'}</Text>
                {!search ? <Pressable onPress={openNewItem} style={styles.emptyAction}><Text style={styles.emptyActionText}>Añadir el primer ingrediente</Text></Pressable> : null}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.seasonIntro}>
              <View style={styles.seasonIllustration}><SymbolView name={{ android: seasonIcon(season) as never, ios: 'leaf', web: seasonIcon(season) as never }} tintColor={colors.greenDark} size={25} /></View>
              <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>Ahora es tiempo de {season.toLowerCase()}</Text><Text style={styles.summarySub}>Ideas de producto de temporada, no inventario de casa.</Text></View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {seasons.map((item) => <Chip key={item} label={item} selected={season === item} onPress={() => setSeason(item)} />)}
            </ScrollView>
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Sabores de {season.toLowerCase()}</Text><Text style={styles.sectionCaption}>{loading ? 'Cargando productos…' : `${seasonalProducts.length} productos para descubrir`}</Text></View>
            {loading ? <View style={styles.loading}><ActivityIndicator color={colors.greenDark} /></View> : <View style={styles.seasonalGrid}>{seasonalProducts.map((product, index) => <SeasonalProductCard key={product.id} product={product} index={index} />)}</View>}
            <Text style={styles.seasonFootnote}>La disponibilidad puede variar según la zona y el clima.</Text>
          </>
        )}
      </ScrollView>

      {formVisible ? <PantryItemForm key={editingItem?.id ?? 'new-pantry-item'} visible initialItem={editingItem} onCancel={() => setFormVisible(false)} onSave={saveItem} /> : null}
    </SafeAreaView>
  );
}

function Segment({ label, description, icon, selected, onPress }: { label: string; description: string; icon: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.segmentItem, selected && styles.segmentItemActive]}>
      <View style={[styles.segmentIcon, selected && styles.segmentIconActive]}><SymbolView name={{ android: icon as never, ios: (label === 'En casa' ? 'cabinet' : 'leaf') as never, web: icon as never }} tintColor={selected ? colors.white : colors.greenDark} size={18} /></View>
      <View style={styles.segmentCopy}><Text style={[styles.segmentTitle, selected && styles.segmentTitleActive]}>{label}</Text><Text style={[styles.segmentSub, selected && styles.segmentSubActive]}>{description}</Text></View>
    </Pressable>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipActive]}><Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text></Pressable>;
}

function PantryItemCard({ item, onEdit, onDelete }: { item: PantryItem; onEdit: () => void; onDelete: () => void }) {
  const expired = item.bestBeforeDate ? item.bestBeforeDate < new Date().toISOString().slice(0, 10) : false;
  return (
    <View style={styles.pantryCard}>
      <View style={[styles.productIcon, { backgroundColor: categoryTones[item.category] ?? '#E9E8DE' }]}>{item.imageLocalUri ? <Image source={{ uri: item.imageLocalUri }} style={styles.pantryImage} /> : <SymbolView name={{ android: pantryIcon(item.category) as never, ios: 'leaf', web: pantryIcon(item.category) as never }} tintColor={colors.greenDark} size={19} />}</View>
      <View style={styles.productCopy}>
        <View style={styles.nameRow}><Text numberOfLines={1} style={styles.productName}>{item.name}</Text><Text style={styles.quantity}>{formatQuantity(item.quantity)} {item.unit}</Text></View>
        <Text style={styles.categoryLabel}>{item.category}</Text>
        {item.bestBeforeDate || item.purchaseDate ? <Text style={[styles.dateLabel, expired && styles.expiredLabel]}>{item.bestBeforeDate ? `${expired ? 'Preferente vencido' : 'Consumir antes'} · ${formatDate(item.bestBeforeDate)}` : `Comprado · ${formatDate(item.purchaseDate!)}`}</Text> : null}
        {item.notes ? <Text numberOfLines={2} style={styles.itemNote}>{item.notes}</Text> : null}
      </View>
      <View style={styles.cardActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`} onPress={onEdit} hitSlop={7} style={styles.smallAction}><SymbolView name={{ android: 'edit', ios: 'pencil', web: 'edit' }} tintColor={colors.greenDark} size={16} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${item.name}`} onPress={onDelete} hitSlop={7} style={styles.smallAction}><SymbolView name={{ android: 'delete_outline', ios: 'trash', web: 'delete_outline' }} tintColor="#AD5B52" size={16} /></Pressable>
      </View>
    </View>
  );
}

function SeasonalProductCard({ product, index }: { product: SeasonalProduct; index: number }) {
  const tones = [colors.greenLight, '#F8EDD1', '#F8E0D2', '#E8E5D8'];
  return (
    <View style={styles.seasonalCard}>
      <View style={[styles.seasonalIcon, { backgroundColor: tones[index % tones.length] }]}><SymbolView name={{ android: pantryIcon(product.category) as never, ios: 'leaf', web: pantryIcon(product.category) as never }} tintColor={colors.greenDark} size={20} /></View>
      <View style={styles.seasonalCardCopy}><View style={styles.seasonalNameRow}><Text style={styles.productName}>{product.name}</Text><Text style={styles.seasonalCategory}>{product.category}</Text></View><Text style={styles.seasonalNote}>{product.note}</Text></View>
    </View>
  );
}

function currentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Primavera';
  if (month >= 6 && month <= 8) return 'Verano';
  if (month >= 9 && month <= 11) return 'Otoño';
  return 'Invierno';
}

function seasonIcon(season: Season): string {
  if (season === 'Primavera') return 'local_florist';
  if (season === 'Verano') return 'wb_sunny';
  if (season === 'Otoño') return 'eco';
  return 'ac_unit';
}

function pantryIcon(category: string): string {
  if (category.toLowerCase().includes('fruta')) return 'nutrition';
  if (category.toLowerCase().includes('seta')) return 'forest';
  if (category.toLowerCase().includes('láct') || category.toLowerCase().includes('lact')) return 'egg_alt';
  if (category.toLowerCase().includes('despensa')) return 'inventory_2';
  return 'eco';
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(quantity);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 32 }, header: { paddingHorizontal: 22, paddingTop: 5, marginBottom: 25 },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { marginHorizontal: 22, color: colors.greenDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, pageTitle: { marginHorizontal: 22, marginTop: 5, color: colors.text, fontFamily: 'serif', fontSize: 34, fontWeight: '700' }, lede: { marginHorizontal: 22, marginTop: 5, color: colors.secondaryText, fontSize: 14, lineHeight: 20 },
  segment: { marginHorizontal: 22, marginTop: 21, marginBottom: 21, padding: 5, flexDirection: 'row', gap: 5, borderRadius: radii.md, backgroundColor: '#EFEADF' }, segmentItem: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 16 }, segmentItemActive: { backgroundColor: colors.greenDark }, segmentIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.white }, segmentIconActive: { backgroundColor: 'rgba(255,255,255,0.18)' }, segmentCopy: { flex: 1, gap: 3 }, segmentTitle: { color: colors.text, fontSize: 12, fontWeight: '700' }, segmentTitleActive: { color: colors.white }, segmentSub: { color: colors.secondaryText, fontSize: 9 }, segmentSubActive: { color: '#DDE8D5' },
  error: { marginHorizontal: 22, marginBottom: 12, color: '#994D43', fontSize: 12, lineHeight: 18 }, homeSummary: { marginHorizontal: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radii.md, backgroundColor: colors.greenLight }, summaryIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.cream }, summaryCopy: { flex: 1, gap: 3 }, summaryTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, summarySub: { color: colors.secondaryText, fontSize: 10, lineHeight: 15 }, addButton: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.greenDark },
  searchBox: { height: 45, marginHorizontal: 22, marginTop: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }, searchInput: { flex: 1, padding: 0, color: colors.text, fontSize: 12 }, chips: { gap: 8, paddingHorizontal: 22, paddingTop: 13, paddingBottom: 5 }, chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }, chipActive: { borderColor: colors.greenDark, backgroundColor: colors.greenDark }, chipText: { color: colors.secondaryText, fontSize: 10, fontWeight: '600' }, chipTextActive: { color: colors.white },
  sectionHeading: { marginHorizontal: 22, marginTop: 25, marginBottom: 12 }, sectionTitle: { color: colors.text, fontFamily: 'serif', fontSize: 23, fontWeight: '700' }, sectionCaption: { marginTop: 3, color: colors.secondaryText, fontSize: 11 }, pantryCard: { minHeight: 82, marginHorizontal: 22, marginBottom: 9, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radii.sm, backgroundColor: colors.white }, productIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, overflow: 'hidden' }, pantryImage: { width: '100%', height: '100%' }, productCopy: { flex: 1, minWidth: 0 }, nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 }, productName: { flexShrink: 1, color: colors.text, fontSize: 13, fontWeight: '700' }, quantity: { color: colors.greenDark, fontSize: 11, fontWeight: '700' }, categoryLabel: { marginTop: 3, color: colors.secondaryText, fontSize: 10 }, dateLabel: { marginTop: 4, color: colors.secondaryText, fontSize: 9 }, expiredLabel: { color: '#AD5B52', fontWeight: '700' }, itemNote: { marginTop: 4, color: '#777568', fontSize: 10, lineHeight: 14 }, cardActions: { gap: 9, alignItems: 'center' }, smallAction: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.background },
  emptyCard: { marginHorizontal: 22, marginTop: 8, padding: 24, alignItems: 'center', borderRadius: radii.md, backgroundColor: colors.white }, emptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.greenLight }, emptyTitle: { marginTop: 13, color: colors.text, fontFamily: 'serif', fontSize: 19, fontWeight: '700', textAlign: 'center' }, emptyCopy: { marginTop: 6, color: colors.secondaryText, fontSize: 11, lineHeight: 17, textAlign: 'center' }, emptyAction: { marginTop: 15, paddingHorizontal: 15, paddingVertical: 10, borderRadius: radii.pill, backgroundColor: colors.greenDark }, emptyActionText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  seasonIntro: { marginHorizontal: 22, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, backgroundColor: '#F8EDD1' }, seasonIllustration: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.cream }, seasonalGrid: { paddingHorizontal: 22, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 9 }, seasonalCard: { width: '48%', minHeight: 144, padding: 13, borderRadius: radii.sm, backgroundColor: colors.white }, seasonalIcon: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, seasonalCardCopy: { marginTop: 10, gap: 5 }, seasonalNameRow: { gap: 3 }, seasonalCategory: { color: colors.greenDark, fontSize: 9, fontWeight: '700' }, seasonalNote: { color: colors.secondaryText, fontSize: 10, lineHeight: 15 }, seasonFootnote: { marginHorizontal: 22, marginTop: 15, color: colors.secondaryText, fontSize: 10, fontStyle: 'italic' },
});
