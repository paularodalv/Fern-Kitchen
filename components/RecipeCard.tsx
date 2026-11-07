import { SymbolView } from 'expo-symbols';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { RecipePreview } from '@/features/recipes/types';
import { colors, radii } from '@/constants/theme';

export function RecipeCard({ recipe, onPress, isFavorite = false, onToggleFavorite }: {
  recipe: RecipePreview;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir receta ${recipe.title}`} onPress={onPress} style={styles.card}>
      <View style={[styles.photo, { backgroundColor: recipe.tone }]}>
        {recipe.imageLocalUri ? (
          <Image source={{ uri: recipe.imageLocalUri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <SymbolView name={{ android: 'restaurant', ios: 'fork.knife', web: 'restaurant' }} tintColor="#8D6E50" size={32} />
            <Text style={styles.photoLabel}>{recipe.category}</Text>
          </View>
        )}
        {recipe.featured ? <View style={styles.featuredBadge}><Text style={styles.featuredText}>DE LA CASA</Text></View> : null}
        {onToggleFavorite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            hitSlop={6}
            onPress={(event) => { event.stopPropagation(); onToggleFavorite(); }}
            style={styles.favoriteButton}
          >
            <SymbolView name={{ android: isFavorite ? 'favorite' : 'favorite_border', ios: isFavorite ? 'heart.fill' : 'heart', web: isFavorite ? 'favorite' : 'favorite_border' }} tintColor={isFavorite ? colors.coral : colors.text} size={20} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>{recipe.title}</Text>
        <Text numberOfLines={1} style={styles.subtitle}>{recipe.subtitle}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}><SymbolView name={{ android: 'schedule', ios: 'clock', web: 'schedule' }} tintColor={colors.greenDark} size={15} /><Text style={styles.metaText}>{recipe.totalMinutes} min</Text></View>
          <View style={styles.dot} />
          <Text style={styles.metaText}>Paciencia {recipe.patienceLevel.toLowerCase()}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 274, backgroundColor: colors.white, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: '#F0EBDF', shadowColor: '#4B442F', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  photo: { height: 178, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  photoPlaceholder: { alignItems: 'center', gap: 8 },
  photoLabel: { color: '#755B42', fontSize: 12, fontWeight: '600' },
  featuredBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.cream },
  featuredText: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  favoriteButton: { position: 'absolute', top: 10, right: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
  copy: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 14 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.25 },
  subtitle: { color: colors.secondaryText, fontSize: 12, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.greenDark, fontSize: 11, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.secondaryText },
});
