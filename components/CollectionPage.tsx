import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { colors, radii } from '@/constants/theme';

export function CollectionPage({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text onPress={() => router.back()} style={styles.back}>‹  Mi colección</Text>
    <Text style={styles.kicker}>FERN KITCHEN · TU CUADERNO</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text>
    {children}
  </ScrollView></SafeAreaView>;
}

export function CollectionCard({ icon, title, detail, onPress, trailing }: { icon: string; title: string; detail: string; onPress?: () => void; trailing?: ReactNode }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}><View style={styles.icon}><SymbolView name={{ android: icon as never, ios: 'sparkles', web: icon as never }} tintColor={colors.greenDark} size={21} /></View><View style={styles.copy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.detail}>{detail}</Text></View>{trailing}</Pressable>;
}

export const collectionStyles = StyleSheet.create({ section: { marginTop: 25, marginBottom: 12, color: colors.greenDark, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }, panel: { padding: 17, borderRadius: radii.md, backgroundColor: colors.white, marginBottom: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, muted: { color: colors.secondaryText, fontSize: 12, lineHeight: 18 }, button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.greenDark }, buttonText: { color: colors.white, fontWeight: '700', fontSize: 12 }, tag: { color: colors.greenDark, backgroundColor: colors.greenLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, fontSize: 10, overflow: 'hidden' } });

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 22, paddingTop: 13, paddingBottom: 40 }, back: { color: colors.greenDark, fontSize: 13, fontWeight: '700', marginBottom: 25 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 }, title: { marginTop: 7, color: colors.text, fontFamily: 'serif', fontSize: 32, fontWeight: '700' }, subtitle: { marginTop: 7, marginBottom: 15, color: colors.secondaryText, fontSize: 13, lineHeight: 20 }, card: { minHeight: 80, marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, backgroundColor: colors.white }, icon: { height: 44, width: 44, borderRadius: 15, backgroundColor: colors.greenLight, justifyContent: 'center', alignItems: 'center' }, copy: { flex: 1, gap: 4 }, cardTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, detail: { color: colors.secondaryText, fontSize: 11, lineHeight: 16 } });
