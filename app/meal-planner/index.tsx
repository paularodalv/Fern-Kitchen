import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { MealPlanEntryForm, mealTypeOptions } from '@/components/MealPlanEntryForm';
import { AppHeader } from '@/components/AppHeader';
import { colors, radii } from '@/constants/theme';
import { addDays, formatDate, formatMonth, getMonthCalendarDays, getMonthKey, getTodayDate, getWeekDates, getWeekStartDate, navigateMonth } from '@/features/meal-planner/calendar';
import { generateShoppingListForWeek } from '@/features/meal-planner/shopping-list';
import { useMealPlanRepository } from '@/hooks/useMealPlanRepository';
import { usePantryRepository } from '@/hooks/usePantryRepository';
import { useRecipeRepository } from '@/hooks/useRecipeRepository';
import { useShoppingListRepository } from '@/hooks/useShoppingListRepository';
import type { MealPlanEntryFields, MealType, PlannedMeal, ShoppingListItem } from '@/types/meal-planner';
import type { PantryItem } from '@/types/pantry';

type PlannerView = 'week' | 'month' | 'shopping';

export default function MealPlannerScreen() {
  const mealRepository = useMealPlanRepository();
  const recipeRepository = useRecipeRepository();
  const shoppingRepository = useShoppingListRepository();
  const pantryRepository = usePantryRepository();
  const today = getTodayDate();
  const [view, setView] = useState<PlannerView>('week');
  const [weekStart, setWeekStart] = useState(getWeekStartDate(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(getMonthKey(today));
  const [entries, setEntries] = useState<PlannedMeal[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [editingEntry, setEditingEntry] = useState<PlannedMeal | null>(null);
  const [formDate, setFormDate] = useState(today);
  const [formMealType, setFormMealType] = useState<MealType>('lunch');
  const [formVisible, setFormVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (view === 'month') {
        const monthStart = `${month}-01`;
        const monthEnd = addDays(navigateMonth(month, 1) + '-01', -1);
        setEntries(await mealRepository.listBetween(monthStart, monthEnd));
      } else if (view === 'week') {
        setEntries(await mealRepository.listBetween(weekStart, addDays(weekStart, 6)));
      } else {
        const [list, pantry] = await Promise.all([
          shoppingRepository.listForWeek(weekStart),
          pantryRepository.list(),
        ]);
        setShoppingItems(list);
        setPantryItems(pantry);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar Mi menú.');
    } finally {
      setLoading(false);
    }
  }, [mealRepository, month, pantryRepository, shoppingRepository, view, weekStart]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, PlannedMeal[]>();
    for (const entry of entries) grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]);
    return grouped;
  }, [entries]);
  const selectedDateEntries = entriesByDate.get(selectedDate) ?? [];
  const weekDates = getWeekDates(weekStart);
  const monthDays = getMonthCalendarDays(month);
  const pantryByName = useMemo(() => {
    const grouped = new Map<string, PantryItem>();
    for (const item of pantryItems) if (item.quantity > 0 && !grouped.has(item.normalizedName)) grouped.set(item.normalizedName, item);
    return grouped;
  }, [pantryItems]);

  const openNewEntry = (date: string, mealType: MealType) => {
    setEditingEntry(null);
    setFormDate(date);
    setFormMealType(mealType);
    setFormVisible(true);
  };

  const openEditEntry = (entry: PlannedMeal) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormMealType(entry.mealType);
    setFormVisible(true);
  };

  const saveEntry = async (fields: MealPlanEntryFields) => {
    if (editingEntry) await mealRepository.update(editingEntry.id, fields);
    else await mealRepository.create(fields);
    setFormVisible(false);
    setView('week');
    setWeekStart(getWeekStartDate(fields.date));
    setSelectedDate(fields.date);
    setMonth(getMonthKey(fields.date));
    setEntries(await mealRepository.listBetween(getWeekStartDate(fields.date), addDays(getWeekStartDate(fields.date), 6)));
  };

  const deleteEntry = (entry: PlannedMeal) => Alert.alert('Quitar del menú', `¿Quieres quitar «${entryTitle(entry)}»?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Quitar', style: 'destructive', onPress: () => {
      void mealRepository.delete(entry.id).then(load).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo quitar la comida.'));
    } },
  ]);

  const moveWeek = (offset: number) => {
    const nextWeekStart = addDays(weekStart, offset * 7);
    setWeekStart(nextWeekStart);
    setSelectedDate(nextWeekStart);
  };

  const moveMonth = (offset: number) => {
    const nextMonth = navigateMonth(month, offset);
    setMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  };

  const openWeekForDate = (date: string) => {
    setWeekStart(getWeekStartDate(date));
    setSelectedDate(date);
    setView('week');
  };

  const generateShoppingList = async () => {
    setGenerating(true);
    setError('');
    try {
      await generateShoppingListForWeek(weekStart, mealRepository, recipeRepository, shoppingRepository);
      setShoppingItems(await shoppingRepository.listForWeek(weekStart));
      setPantryItems(await pantryRepository.list());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo preparar la lista de compra.');
    } finally {
      setGenerating(false);
    }
  };

  const togglePurchased = async (item: ShoppingListItem) => {
    try {
      await shoppingRepository.setPurchased(item.id, !item.isPurchased);
      setShoppingItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, isPurchased: !currentItem.isPurchased } : currentItem));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la lista.');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver al cuaderno" onPress={() => router.back()} style={styles.backButton}><SymbolView name={{ android: 'arrow_back', ios: 'arrow.left', web: 'arrow_back' }} tintColor={colors.text} size={20} /></Pressable>
          <View style={styles.headerCopy}><AppHeader /><Text style={styles.pageTitle}>Mi menú</Text></View>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.lede}>Un cuaderno amable para organizar lo que te apetece cocinar.</Text>

        <View style={styles.viewSelector}>
          <ViewButton label="Semana" icon="view_week" selected={view === 'week'} onPress={() => setView('week')} />
          <ViewButton label="Mes" icon="calendar_month" selected={view === 'month'} onPress={() => setView('month')} />
          <ViewButton label="Compra" icon="shopping_basket" selected={view === 'shopping'} onPress={() => setView('shopping')} />
        </View>

        {view === 'week' ? (
          <>
            <DateNavigator title={weekTitle(weekStart)} onPrevious={() => moveWeek(-1)} onNext={() => moveWeek(1)} />
            {loading ? <LoadingState /> : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStrip}>
                  {weekDates.map((date) => <WeekDayCard key={date} date={date} entries={entriesByDate.get(date) ?? []} selected={date === selectedDate} onPress={() => setSelectedDate(date)} />)}
                </ScrollView>
                <View style={styles.dayHeading}><Text style={styles.dayTitle}>{formatDate(selectedDate)}</Text><Text style={styles.daySub}>{selectedDateEntries.length ? `${selectedDateEntries.length} comidas en el menú` : 'Un día con espacio para lo que surja'}</Text></View>
                {mealTypeOptions.map((option) => {
                  const entry = selectedDateEntries.find((item) => item.mealType === option.type);
                  return entry
                    ? <PlannedMealCard key={option.type} entry={entry} mealLabel={option.label} onEdit={() => openEditEntry(entry)} onDelete={() => deleteEntry(entry)} onOpenRecipe={() => { if (entry.recipeExists && entry.recipeId) router.push({ pathname: '/recipes/[id]', params: { id: entry.recipeId } }); }} />
                    : <EmptyMealSlot key={option.type} label={option.label} icon={option.icon} onPress={() => openNewEntry(selectedDate, option.type)} />;
                })}
              </>
            )}
          </>
        ) : view === 'month' ? (
          <>
            <DateNavigator title={capitalize(formatMonth(month))} onPrevious={() => moveMonth(-1)} onNext={() => moveMonth(1)} />
            {loading ? <LoadingState /> : (
              <>
                <View style={styles.calendarWeekdays}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => <Text key={`${day}-${index}`} style={styles.calendarWeekday}>{day}</Text>)}</View>
                <View style={styles.calendarGrid}>
                  {monthDays.map((day, index) => day
                    ? <MonthDayCell key={day.date} date={day.date} selected={day.date === selectedDate} plannedCount={entriesByDate.get(day.date)?.length ?? 0} onPress={() => setSelectedDate(day.date)} />
                    : <View key={`blank-${index}`} style={styles.calendarBlank} />)}
                </View>
                <View style={styles.monthSelectedHeading}><Text style={styles.dayTitle}>{formatDate(selectedDate)}</Text><Text style={styles.daySub}>{selectedDateEntries.length ? `${selectedDateEntries.length} comidas planificadas` : 'Todavía no hay comidas para este día'}</Text></View>
                {selectedDateEntries.map((entry) => <MonthMealRow key={entry.id} entry={entry} onPress={() => openWeekForDate(selectedDate)} />)}
                <Pressable accessibilityRole="button" onPress={() => openWeekForDate(selectedDate)} style={styles.openWeekButton}><Text style={styles.openWeekText}>Abrir esta semana</Text><SymbolView name={{ android: 'arrow_forward', ios: 'arrow.right', web: 'arrow_forward' }} tintColor={colors.white} size={17} /></Pressable>
              </>
            )}
          </>
        ) : (
          <>
            <DateNavigator title={weekTitle(weekStart)} onPrevious={() => moveWeek(-1)} onNext={() => moveWeek(1)} />
            <View style={styles.shoppingIntro}><View style={styles.shoppingIcon}><SymbolView name={{ android: 'shopping_basket', ios: 'basket', web: 'shopping_basket' }} tintColor={colors.greenDark} size={22} /></View><View style={styles.shoppingIntroCopy}><Text style={styles.shoppingIntroTitle}>Tu lista para esta semana</Text><Text style={styles.shoppingIntroSub}>Se calcula desde las recetas planificadas y sus raciones.</Text></View></View>
            <Pressable accessibilityRole="button" disabled={generating} onPress={() => { void generateShoppingList(); }} style={[styles.generateButton, generating && styles.disabled]}>{generating ? <ActivityIndicator color={colors.white} /> : <><SymbolView name={{ android: 'auto_awesome', ios: 'sparkles', web: 'auto_awesome' }} tintColor={colors.white} size={17} /><Text style={styles.generateText}>Generar desde las recetas de la semana</Text></>}</Pressable>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {loading ? <LoadingState /> : shoppingItems.length ? (
              <>
                <Text style={styles.shoppingCount}>{shoppingItems.filter((item) => !item.isPurchased).length} por comprar · {shoppingItems.filter((item) => item.isPurchased).length} en la cesta</Text>
                {shoppingItems.map((item) => <ShoppingItemCard key={item.id} item={item} pantryItem={pantryByName.get(item.normalizedName)} onPress={() => { void togglePurchased(item); }} />)}
                <Text style={styles.pantryHint}>Las sugerencias de Alacena solo indican posibles existencias; no se descuenta ninguna cantidad.</Text>
              </>
            ) : <ShoppingEmptyState />}
          </>
        )}

        {error && view !== 'shopping' ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <View style={styles.bottomSpace} />
      </ScrollView>
      {formVisible ? <MealPlanEntryForm key={editingEntry?.id ?? `new-${formDate}-${formMealType}`} visible date={formDate} mealType={formMealType} initialEntry={editingEntry} onCancel={() => setFormVisible(false)} onSave={saveEntry} /> : null}
    </SafeAreaView>
  );
}

function ViewButton({ label, icon, selected, onPress }: { label: string; icon: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.viewButton, selected && styles.viewButtonActive]}><SymbolView name={{ android: icon as never, ios: (label === 'Semana' ? 'calendar' : label === 'Mes' ? 'calendar' : 'basket') as never, web: icon as never }} tintColor={selected ? colors.white : colors.greenDark} size={16} /><Text style={[styles.viewButtonText, selected && styles.viewButtonTextActive]}>{label}</Text></Pressable>;
}

function DateNavigator({ title, onPrevious, onNext }: { title: string; onPrevious: () => void; onNext: () => void }) {
  return <View style={styles.dateNavigator}><Pressable accessibilityRole="button" accessibilityLabel="Anterior" onPress={onPrevious} style={styles.navArrow}><SymbolView name={{ android: 'chevron_left', ios: 'chevron.left', web: 'chevron_left' }} tintColor={colors.greenDark} size={19} /></Pressable><Text style={styles.navigatorTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Siguiente" onPress={onNext} style={styles.navArrow}><SymbolView name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }} tintColor={colors.greenDark} size={19} /></Pressable></View>;
}

function WeekDayCard({ date, entries, selected, onPress }: { date: string; entries: PlannedMeal[]; selected: boolean; onPress: () => void }) {
  const weekday = formatDate(date, { weekday: 'short' }).replace('.', '');
  const number = Number(date.slice(-2));
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.weekDayCard, selected && styles.weekDayCardActive]}>
      <Text style={[styles.weekDayName, selected && styles.weekDayTextActive]}>{capitalize(weekday)}</Text>
      <Text style={[styles.weekDayNumber, selected && styles.weekDayTextActive]}>{number}</Text>
      {entries.length ? <View style={styles.daySummary}>
        {entries.slice(0, 2).map((entry) => <Text key={entry.id} numberOfLines={1} style={[styles.dayMealPreview, selected && styles.dayMealPreviewActive]}>{mealLabel(entry.mealType)} · {entryTitle(entry)}</Text>)}
        {entries.length > 2 ? <Text style={[styles.moreMeals, selected && styles.dayMealPreviewActive]}>+{entries.length - 2} más</Text> : null}
      </View> : <Text style={[styles.noDayMeals, selected && styles.dayMealPreviewActive]}>Libre</Text>}
    </Pressable>
  );
}

function EmptyMealSlot({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.emptySlot}><View style={styles.slotIcon}><SymbolView name={{ android: icon as never, ios: 'fork.knife', web: icon as never }} tintColor={colors.greenDark} size={17} /></View><View style={styles.slotCopy}><Text style={styles.slotTitle}>{label}</Text><Text style={styles.slotHint}>Dejar libre o añadir una comida</Text></View><View style={styles.slotAdd}><SymbolView name={{ android: 'add', ios: 'plus', web: 'add' }} tintColor={colors.greenDark} size={19} /></View></Pressable>;
}

function PlannedMealCard({ entry, mealLabel: typeLabel, onEdit, onDelete, onOpenRecipe }: { entry: PlannedMeal; mealLabel: string; onEdit: () => void; onDelete: () => void; onOpenRecipe: () => void }) {
  return (
    <View style={styles.plannedCard}>
      {entry.recipeExists && entry.recipeImageLocalUri ? <Image source={{ uri: entry.recipeImageLocalUri }} style={styles.plannedImage} resizeMode="cover" /> : <View style={styles.plannedImagePlaceholder}><SymbolView name={{ android: entry.recipeExists ? 'restaurant' : entry.entryKind === 'custom' ? 'restaurant_menu' : 'info', ios: 'fork.knife', web: entry.recipeExists ? 'restaurant' : 'restaurant_menu' }} tintColor={colors.greenDark} size={19} /></View>}
      <View style={styles.plannedCopy}>
        <Text style={styles.mealTypeLabel}>{typeLabel.toUpperCase()}</Text>
        <Text numberOfLines={1} style={styles.plannedTitle}>{entryTitle(entry)}</Text>
        <Text style={styles.plannedSub}>{entry.recipeExists ? 'Receta de tu cuaderno' : entry.entryKind === 'recipe' ? 'La receta vinculada ya no está disponible' : `${entry.servings} raciones`}</Text>
        {entry.entryKind === 'custom' && entry.customMealDescription ? <Text numberOfLines={1} style={styles.plannedDescription}>{entry.customMealDescription}</Text> : null}
        {entry.notes ? <Text numberOfLines={1} style={styles.plannedDescription}>Nota · {entry.notes}</Text> : null}
        {entry.recipeExists ? <Pressable accessibilityRole="button" onPress={onOpenRecipe} style={styles.recipeLink}><Text style={styles.recipeLinkText}>Ver receta · {entry.servings} raciones</Text></Pressable> : null}
      </View>
      <View style={styles.mealActions}><Pressable accessibilityRole="button" accessibilityLabel="Editar comida" onPress={onEdit} hitSlop={6} style={styles.actionButton}><SymbolView name={{ android: 'edit', ios: 'pencil', web: 'edit' }} tintColor={colors.greenDark} size={15} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Quitar comida" onPress={onDelete} hitSlop={6} style={styles.actionButton}><SymbolView name={{ android: 'delete_outline', ios: 'trash', web: 'delete_outline' }} tintColor="#AD5B52" size={15} /></Pressable></View>
    </View>
  );
}

function MonthDayCell({ date, selected, plannedCount, onPress }: { date: string; selected: boolean; plannedCount: number; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${formatDate(date)}, ${plannedCount} comidas`} onPress={onPress} style={[styles.calendarCell, selected && styles.calendarCellActive]}><Text style={[styles.calendarNumber, selected && styles.calendarTextActive]}>{Number(date.slice(-2))}</Text>{plannedCount ? <View style={[styles.calendarDot, selected && styles.calendarDotActive]} /> : <View style={styles.calendarDotSpacer} />}</Pressable>;
}

function MonthMealRow({ entry, onPress }: { entry: PlannedMeal; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.monthMealRow}><View style={styles.monthMealDot} /><View style={styles.monthMealCopy}><Text style={styles.monthMealType}>{mealLabel(entry.mealType)}</Text><Text numberOfLines={1} style={styles.monthMealTitle}>{entryTitle(entry)}</Text></View><SymbolView name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }} tintColor={colors.secondaryText} size={16} /></Pressable>;
}

function ShoppingItemCard({ item, pantryItem, onPress }: { item: ShoppingListItem; pantryItem?: PantryItem; onPress: () => void }) {
  const quantity = item.hasQuantity && item.quantity !== null ? `${formatQuantity(item.quantity)}${item.unit ? ` ${item.unit}` : ''}` : item.unit || 'Al gusto';
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.isPurchased }} onPress={onPress} style={[styles.shoppingItem, item.isPurchased && styles.shoppingItemPurchased]}><View style={[styles.shoppingCheck, item.isPurchased && styles.shoppingCheckActive]}>{item.isPurchased ? <SymbolView name={{ android: 'check', ios: 'checkmark', web: 'check' }} tintColor={colors.white} size={14} /> : null}</View><View style={styles.shoppingItemCopy}><View style={styles.shoppingItemTop}><Text numberOfLines={1} style={[styles.shoppingItemName, item.isPurchased && styles.purchasedText]}>{item.name}</Text><Text style={[styles.shoppingQuantity, item.isPurchased && styles.purchasedText]}>{quantity}</Text></View>{pantryItem ? <Text style={styles.pantryAvailable}>Puede que ya tengas {formatQuantity(pantryItem.quantity)} {pantryItem.unit} en Alacena</Text> : null}</View></Pressable>;
}

function ShoppingEmptyState() {
  return <View style={styles.shoppingEmpty}><View style={styles.emptyBasket}><SymbolView name={{ android: 'shopping_basket', ios: 'basket', web: 'shopping_basket' }} tintColor={colors.greenDark} size={24} /></View><Text style={styles.shoppingEmptyTitle}>La cesta está esperando</Text><Text style={styles.shoppingEmptyText}>Planifica recetas para la semana y genera aquí tu lista de compra.</Text></View>;
}

function LoadingState() {
  return <View style={styles.loadingState}><ActivityIndicator color={colors.greenDark} /></View>;
}

function mealLabel(type: MealType): string {
  return mealTypeOptions.find((option) => option.type === type)?.label ?? '';
}

function entryTitle(entry: PlannedMeal): string {
  if (entry.entryKind === 'custom') return entry.customMealName ?? 'Comida libre';
  return entry.recipeExists ? entry.recipeTitle ?? 'Receta' : 'Receta no disponible';
}

function weekTitle(weekStart: string): string {
  const weekEnd = addDays(weekStart, 6);
  const start = formatDate(weekStart, { day: 'numeric', month: 'short' }).replace('.', '');
  const end = formatDate(weekEnd, { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
  return `${capitalize(start)} – ${end}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('es-ES') + value.slice(1);
}

function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(quantity);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 30 }, header: { minHeight: 57, paddingHorizontal: 18, paddingTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }, backButton: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.white }, headerCopy: { flex: 1 }, headerSpacer: { width: 39 }, pageTitle: { marginTop: -3, color: colors.text, fontFamily: 'serif', fontSize: 26, fontWeight: '700', textAlign: 'center' }, lede: { marginHorizontal: 22, marginTop: 1, color: colors.secondaryText, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  viewSelector: { marginHorizontal: 20, marginTop: 18, marginBottom: 12, padding: 4, flexDirection: 'row', gap: 3, borderRadius: radii.pill, backgroundColor: '#EFEADF' }, viewButton: { flex: 1, minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: radii.pill }, viewButtonActive: { backgroundColor: colors.greenDark }, viewButtonText: { color: colors.secondaryText, fontSize: 10, fontWeight: '600' }, viewButtonTextActive: { color: colors.white }, dateNavigator: { minHeight: 51, marginHorizontal: 20, marginTop: 6, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, navArrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.white }, navigatorTitle: { color: colors.text, fontFamily: 'serif', fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  weekStrip: { gap: 8, paddingHorizontal: 20, paddingBottom: 5 }, weekDayCard: { width: 112, minHeight: 100, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.white }, weekDayCardActive: { borderColor: colors.greenDark, backgroundColor: colors.greenDark }, weekDayName: { color: colors.secondaryText, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }, weekDayNumber: { marginTop: 2, color: colors.text, fontSize: 19, fontWeight: '700' }, weekDayTextActive: { color: colors.white }, daySummary: { marginTop: 4, gap: 2 }, dayMealPreview: { color: colors.greenDark, fontSize: 8, lineHeight: 11 }, dayMealPreviewActive: { color: '#E6F0DD' }, noDayMeals: { marginTop: 7, color: colors.secondaryText, fontSize: 9 }, moreMeals: { color: colors.greenDark, fontSize: 8, fontWeight: '700' },
  dayHeading: { marginHorizontal: 22, marginTop: 20, marginBottom: 11 }, dayTitle: { color: colors.text, fontFamily: 'serif', fontSize: 21, fontWeight: '700', textTransform: 'capitalize' }, daySub: { marginTop: 3, color: colors.secondaryText, fontSize: 10 }, emptySlot: { minHeight: 65, marginHorizontal: 20, marginBottom: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D8D4C8', borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.55)' }, slotIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.greenLight }, slotCopy: { flex: 1, gap: 3 }, slotTitle: { color: colors.text, fontSize: 11, fontWeight: '700' }, slotHint: { color: colors.secondaryText, fontSize: 9 }, slotAdd: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.cream }, plannedCard: { minHeight: 91, marginHorizontal: 20, marginBottom: 8, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 15, backgroundColor: colors.white, elevation: 1, shadowColor: '#3A392F', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, plannedImage: { width: 48, height: 48, borderRadius: 14 }, plannedImagePlaceholder: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.greenLight }, plannedCopy: { flex: 1, minWidth: 0 }, mealTypeLabel: { color: colors.greenDark, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 }, plannedTitle: { marginTop: 3, color: colors.text, fontSize: 12, fontWeight: '700' }, plannedSub: { marginTop: 3, color: colors.secondaryText, fontSize: 9, lineHeight: 13 }, plannedDescription: { marginTop: 3, color: '#777568', fontSize: 9 }, recipeLink: { alignSelf: 'flex-start', marginTop: 5 }, recipeLinkText: { color: colors.greenDark, fontSize: 9, fontWeight: '700' }, mealActions: { flexDirection: 'row', gap: 5 }, actionButton: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.background },
  calendarWeekdays: { marginHorizontal: 19, flexDirection: 'row', justifyContent: 'space-around' }, calendarWeekday: { width: '13.8%', paddingVertical: 8, color: colors.secondaryText, fontSize: 10, fontWeight: '700', textAlign: 'center' }, calendarGrid: { marginHorizontal: 18, flexDirection: 'row', flexWrap: 'wrap' }, calendarCell: { width: '14.28%', height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, calendarCellActive: { backgroundColor: colors.greenDark }, calendarBlank: { width: '14.28%', height: 43 }, calendarNumber: { color: colors.text, fontSize: 12 }, calendarTextActive: { color: colors.white, fontWeight: '700' }, calendarDot: { width: 4, height: 4, marginTop: 3, borderRadius: 2, backgroundColor: colors.coral }, calendarDotActive: { backgroundColor: colors.butter }, calendarDotSpacer: { height: 7 }, monthSelectedHeading: { marginHorizontal: 22, marginTop: 19, marginBottom: 9 }, monthMealRow: { minHeight: 53, marginHorizontal: 20, marginBottom: 6, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 13, backgroundColor: colors.white }, monthMealDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral }, monthMealCopy: { flex: 1 }, monthMealType: { color: colors.greenDark, fontSize: 9, fontWeight: '700' }, monthMealTitle: { marginTop: 2, color: colors.text, fontSize: 11, fontWeight: '600' }, openWeekButton: { minHeight: 45, marginHorizontal: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radii.pill, backgroundColor: colors.greenDark }, openWeekText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  shoppingIntro: { marginHorizontal: 20, marginTop: 6, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 17, backgroundColor: '#F8EDD1' }, shoppingIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.cream }, shoppingIntroCopy: { flex: 1, gap: 3 }, shoppingIntroTitle: { color: colors.text, fontSize: 12, fontWeight: '700' }, shoppingIntroSub: { color: colors.secondaryText, fontSize: 9, lineHeight: 13 }, generateButton: { minHeight: 46, marginHorizontal: 20, marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radii.pill, backgroundColor: colors.greenDark }, generateText: { color: colors.white, fontSize: 10, fontWeight: '700' }, disabled: { opacity: 0.65 }, shoppingCount: { marginHorizontal: 22, marginTop: 17, marginBottom: 8, color: colors.secondaryText, fontSize: 10, fontWeight: '600' }, shoppingItem: { minHeight: 60, marginHorizontal: 20, marginBottom: 7, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.white }, shoppingItemPurchased: { backgroundColor: '#F2F0E9' }, shoppingCheck: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#C7C4B8', borderRadius: 8 }, shoppingCheckActive: { borderColor: colors.green, backgroundColor: colors.green }, shoppingItemCopy: { flex: 1 }, shoppingItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 }, shoppingItemName: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '700' }, shoppingQuantity: { color: colors.greenDark, fontSize: 10, fontWeight: '700' }, purchasedText: { color: colors.secondaryText, textDecorationLine: 'line-through' }, pantryAvailable: { marginTop: 4, color: '#94752F', fontSize: 9 }, pantryHint: { marginHorizontal: 23, marginTop: 9, color: colors.secondaryText, fontSize: 9, lineHeight: 14 }, shoppingEmpty: { marginHorizontal: 20, marginTop: 17, padding: 23, alignItems: 'center', borderRadius: 18, backgroundColor: colors.white }, emptyBasket: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.greenLight }, shoppingEmptyTitle: { marginTop: 11, color: colors.text, fontFamily: 'serif', fontSize: 18, fontWeight: '700' }, shoppingEmptyText: { marginTop: 5, color: colors.secondaryText, fontSize: 10, lineHeight: 16, textAlign: 'center' },
  loadingState: { minHeight: 190, alignItems: 'center', justifyContent: 'center' }, error: { marginHorizontal: 21, marginTop: 12, color: '#994D43', fontSize: 11, lineHeight: 17 }, bottomSpace: { height: 20 },
});
