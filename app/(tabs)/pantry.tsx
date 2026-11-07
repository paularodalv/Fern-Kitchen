import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { AppHeader } from '@/components/AppHeader';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, radii } from '@/constants/theme';

const groups = [
  { title: 'Verduras', icon: 'nutrition', count: '6 cosas', tone: '#E5EFD9', items: ['Tomates maduros', 'Calabacín', 'Espinacas', 'Cebolla morada'] },
  { title: 'Fruta', icon: 'grocery', count: '4 cosas', tone: '#F5D58A', items: ['Limones', 'Peras', 'Manzanas'] },
  { title: 'Despensa', icon: 'inventory_2', count: '12 cosas', tone: '#F3B38F', items: ['Garbanzos', 'Arroz', 'Harina de trigo', 'Aceite de oliva'] },
] as const;

export default function PantryScreen() {
  const [selected, setSelected] = useState('Todo');
  const visibleGroups = selected === 'Todo' ? groups : groups.filter((group) => group.title === selected);
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><AppHeader /></View>
        <Text style={styles.eyebrow}>LO QUE HAY EN CASA</Text>
        <Text style={styles.pageTitle}>La alacena</Text>
        <Text style={styles.lede}>Un vistazo amable a lo que tienes a mano.</Text>
        <View style={styles.summary}>
          <View style={styles.summaryIcon}><SymbolView name={{ android: 'shelves', ios: 'cabinet', web: 'shelves' }} tintColor={colors.greenDark} size={24} /></View>
          <View style={{ flex: 1 }}><Text style={styles.summaryTitle}>22 ingredientes</Text><Text style={styles.summaryCopy}>y muchas posibilidades</Text></View>
          <SymbolView name={{ android: 'arrow_forward', ios: 'arrow.right', web: 'arrow_forward' }} tintColor={colors.greenDark} size={18} />
        </View>
        <View style={styles.filterRow}>
          {['Todo', 'Verduras', 'Fruta', 'Despensa'].map((label) => {
            const active = selected === label;
            return <Pressable key={label} onPress={() => setSelected(label)} style={[styles.filter, active && styles.filterActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
          })}
        </View>
        {visibleGroups.map((group) => (
          <View key={group.title} style={styles.group}>
            <SectionTitle title={group.title} actionLabel={group.count} />
            <View style={styles.items}>
              {group.items.map((item, index) => (
                <View key={item} style={styles.item}>
                  <View style={[styles.itemIcon, { backgroundColor: group.tone }]}>
                    <SymbolView name={{ android: group.icon, ios: 'leaf', web: group.icon }} tintColor={colors.greenDark} size={18} />
                  </View>
                  <Text style={styles.itemName}>{item}</Text>
                  {index === 0 ? <View style={styles.freshDot} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 32 },
  header: { paddingHorizontal: 22, paddingTop: 5, marginBottom: 27 },
  eyebrow: { marginHorizontal: 22, color: colors.greenDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  pageTitle: { marginHorizontal: 22, marginTop: 5, color: colors.text, fontFamily: 'serif', fontSize: 34, fontWeight: '700' },
  lede: { marginHorizontal: 22, marginTop: 5, color: colors.secondaryText, fontSize: 14 },
  summary: { marginHorizontal: 22, marginTop: 23, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, backgroundColor: colors.greenLight },
  summaryIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { color: colors.text, fontSize: 15, fontWeight: '700' }, summaryCopy: { color: colors.secondaryText, fontSize: 12, marginTop: 3 },
  filterRow: { paddingHorizontal: 22, flexDirection: 'row', gap: 8, marginTop: 21, marginBottom: 25 },
  filter: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.white, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.greenDark, borderColor: colors.greenDark }, filterText: { color: colors.secondaryText, fontSize: 12, fontWeight: '600' }, filterTextActive: { color: colors.white },
  group: { marginBottom: 19, paddingHorizontal: 22 }, items: { gap: 8 },
  item: { minHeight: 64, flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12, borderRadius: radii.sm, backgroundColor: colors.white },
  itemIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }, freshDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
});
