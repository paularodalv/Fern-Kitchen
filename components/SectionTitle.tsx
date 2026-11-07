import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export function SectionTitle({ title, subtitle, actionLabel, onActionPress }: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? <Pressable onPress={onActionPress} hitSlop={8}><Text style={styles.action}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  copy: { gap: 4 },
  title: { color: colors.text, fontFamily: 'serif', fontSize: 25, fontWeight: '700', letterSpacing: -0.45 },
  subtitle: { color: colors.secondaryText, fontSize: 13 },
  action: { color: colors.greenDark, fontSize: 13, fontWeight: '700', paddingBottom: 3 },
});
