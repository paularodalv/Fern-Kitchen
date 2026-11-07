import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type AppHeaderProps = { onSearchPress?: () => void; onProfilePress?: () => void };

export function AppHeader({ onSearchPress, onProfilePress }: AppHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <SymbolView name={{ android: 'spa', ios: 'leaf', web: 'spa' }} tintColor={colors.greenDark} size={22} />
        </View>
        <View>
          <Text style={styles.name}>Fern Kitchen</Text>
          <Text style={styles.tagline}>cocina con calma</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Buscar recetas" onPress={onSearchPress} style={styles.iconButton}>
          <SymbolView name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }} tintColor={colors.text} size={21} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Mi cocina" onPress={onProfilePress} style={styles.avatar}>
          <SymbolView name={{ android: 'person', ios: 'person', web: 'person' }} tintColor={colors.greenDark} size={21} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  tagline: { color: colors.secondaryText, fontSize: 11, letterSpacing: 0.5, marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.butter, alignItems: 'center', justifyContent: 'center' },
});
