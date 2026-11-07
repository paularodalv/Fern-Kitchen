import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radii } from '@/constants/theme';
import type { RecipeSeason } from '@/types/recipe';

export type Season = 'Todas' | RecipeSeason;
const seasons: Season[] = ['Todas', 'Primavera', 'Verano', 'Otoño', 'Invierno', 'Todo el año'];

export function SeasonSelector({ selected, onSelect }: { selected: Season; onSelect: (season: Season) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {seasons.map((season) => {
        const active = season === selected;
        return (
          <Pressable key={season} onPress={() => onSelect(season)} style={[styles.chip, active && styles.activeChip]}>
            <Text style={[styles.label, active && styles.activeLabel]}>{season}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  activeChip: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  label: { color: colors.secondaryText, fontSize: 13, fontWeight: '600' },
  activeLabel: { color: colors.white },
});
