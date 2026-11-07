import { FlatList, StyleSheet, View } from 'react-native';
import type { RecipePreview } from '@/features/recipes/types';
import { RecipeCard } from './RecipeCard';

export function RecipeCarousel({ recipes, onRecipePress, favorites = [], onFavoritePress }: {
  recipes: RecipePreview[];
  onRecipePress: (recipe: RecipePreview) => void;
  favorites?: string[];
  onFavoritePress?: (recipe: RecipePreview) => void;
}) {
  return (
    <FlatList
      horizontal
      data={recipes}
      keyExtractor={(recipe) => recipe.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
      renderItem={({ item }) => (
        <RecipeCard
          recipe={item}
          onPress={() => onRecipePress(item)}
          isFavorite={favorites.includes(item.id)}
          onToggleFavorite={onFavoritePress ? () => onFavoritePress(item) : undefined}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({ content: { paddingHorizontal: 22, paddingBottom: 8 } });
