import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/fern-mouse.png')} style={styles.mouse} resizeMode="contain" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{children}</Text>
      <View style={styles.dash} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 28, justifyContent: 'center', alignItems: 'center' },
  mouse: { width: 150, height: 150, marginBottom: 18, borderRadius: 75 },
  title: { color: colors.text, fontFamily: 'serif', fontSize: 28, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  description: { color: colors.secondaryText, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 280 },
  dash: { width: 34, height: 3, borderRadius: 2, backgroundColor: colors.butter, marginTop: 22 },
});
