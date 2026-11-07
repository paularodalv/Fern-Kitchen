import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

export function BotanicalDecoration({ size = 34 }: { size?: number }) {
  return (
    <View pointerEvents="none" style={[styles.container, { width: size, height: size }]}>
      <SymbolView name={{ android: 'eco', ios: 'leaf', web: 'eco' }} tintColor={colors.green} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { alignItems: 'center', justifyContent: 'center', opacity: 0.68, transform: [{ rotate: '-20deg' }] } });
