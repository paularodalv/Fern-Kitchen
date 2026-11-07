import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { AppHeader } from '@/components/AppHeader';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, radii } from '@/constants/theme';
import { router } from 'expo-router';

const preferences = ['De temporada', 'Sin complicaciones', 'Para compartir'];

export default function KitchenScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><AppHeader /></View>
        <Text style={styles.eyebrow}>TU RINCÓN</Text>
        <Text style={styles.title}>Mi cocina</Text>
        <Text style={styles.lede}>Un pequeño retrato de cómo te gusta cocinar.</Text>

        <Pressable accessibilityRole="button" onPress={() => router.push('/collection' as never)} style={styles.collectionCard}>
          <View style={styles.collectionIcon}><SymbolView name={{ android: 'auto_awesome', ios: 'sparkles', web: 'auto_awesome' }} tintColor={colors.greenDark} size={23} /></View>
          <View style={{ flex: 1 }}><Text style={styles.collectionTitle}>Mi colección</Text><Text style={styles.collectionHint}>Tus avances, pegatinas y pequeños detalles personales.</Text></View>
          <SymbolView name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }} tintColor={colors.greenDark} size={18} />
        </Pressable>

        <View style={styles.profileCard}>
          <View style={styles.profileIcon}><SymbolView name={{ android: 'soup_kitchen', ios: 'fork.knife.circle', web: 'soup_kitchen' }} tintColor={colors.greenDark} size={29} /></View>
          <View style={{ flex: 1 }}><Text style={styles.profileName}>Tu mesa, tus reglas</Text><Text style={styles.profileHint}>La cocina de cada día puede ser especial.</Text></View>
          <SymbolView name={{ android: 'edit', ios: 'pencil', web: 'edit' }} tintColor={colors.secondaryText} size={18} />
        </View>

        <View style={styles.section}><SectionTitle title="Así te gusta cocinar" subtitle="Elige lo que te inspira" /></View>
        <View style={styles.preferenceWrap}>
          {preferences.map((item, index) => (
            <View key={item} style={[styles.preference, index === 0 && styles.preferenceActive]}>
              <SymbolView name={{ android: index === 0 ? 'check' : 'add', ios: index === 0 ? 'checkmark' : 'plus', web: index === 0 ? 'check' : 'add' }} tintColor={index === 0 ? colors.greenDark : colors.secondaryText} size={16} />
              <Text style={[styles.preferenceText, index === 0 && styles.preferenceTextActive]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}><SymbolView name={{ android: 'lightbulb', ios: 'lightbulb', web: 'lightbulb' }} tintColor="#926D22" size={21} /></View>
          <View style={styles.tipCopy}><Text style={styles.tipTitle}>Un apunte para tu cocina</Text><Text style={styles.tipText}>Las hierbas frescas duran más si las guardas como un ramo, con los tallos en un vaso de agua.</Text></View>
        </View>

        <Pressable style={styles.rowButton}>
          <View style={styles.rowIcon}><SymbolView name={{ android: 'notifications', ios: 'bell', web: 'notifications' }} tintColor={colors.greenDark} size={19} /></View>
          <Text style={styles.rowText}>Recordatorios de cocina</Text>
          <SymbolView name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }} tintColor={colors.secondaryText} size={18} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 32 }, header: { paddingHorizontal: 22, paddingTop: 5, marginBottom: 27 },
  eyebrow: { marginHorizontal: 22, color: colors.greenDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, title: { marginHorizontal: 22, marginTop: 5, color: colors.text, fontFamily: 'serif', fontSize: 34, fontWeight: '700' }, lede: { marginHorizontal: 22, marginTop: 5, color: colors.secondaryText, fontSize: 14 },
  profileCard: { marginHorizontal: 22, marginTop: 23, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, backgroundColor: colors.greenLight }, profileIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }, profileName: { color: colors.text, fontSize: 15, fontWeight: '700' }, profileHint: { color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 3 },
  collectionCard: { marginHorizontal: 22, marginTop: 14, minHeight: 86, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, backgroundColor: colors.white, shadowColor: colors.text, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, collectionIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' }, collectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, collectionHint: { color: colors.secondaryText, fontSize: 11, lineHeight: 16, marginTop: 3 },
  section: { marginHorizontal: 22, marginTop: 31, marginBottom: 2 }, preferenceWrap: { marginHorizontal: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, preference: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }, preferenceActive: { borderColor: colors.greenLight, backgroundColor: colors.greenLight }, preferenceText: { color: colors.secondaryText, fontSize: 11, fontWeight: '600' }, preferenceTextActive: { color: colors.greenDark },
  tipCard: { marginHorizontal: 22, marginTop: 27, padding: 17, flexDirection: 'row', gap: 12, borderRadius: radii.md, backgroundColor: '#F8EDD1' }, tipIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }, tipCopy: { flex: 1, gap: 6 }, tipTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, tipText: { color: '#77705E', fontSize: 12, lineHeight: 19 },
  rowButton: { marginHorizontal: 22, marginTop: 15, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, borderRadius: radii.sm, backgroundColor: colors.white }, rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' }, rowText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
});
