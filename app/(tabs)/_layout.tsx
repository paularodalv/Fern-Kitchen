import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router/js-tabs';
import { BottomNavigation } from '@/components/BottomNavigation';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.greenDark,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        tabBarIconStyle: { marginTop: 1 },
        tabBarStyle: {
          height: 76,
          paddingTop: 8,
          paddingBottom: 9,
          backgroundColor: colors.cream,
          borderTopColor: '#EEE8DA',
          borderTopWidth: 1,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Cuaderno', tabBarIcon: ({ color }) => <SymbolView name={{ android: 'menu_book', ios: 'book.closed', web: 'menu_book' }} tintColor={color} size={22} /> }} />
      <Tabs.Screen name="pantry" options={{ title: 'Alacena', tabBarIcon: ({ color }) => <SymbolView name={{ android: 'shelves', ios: 'cabinet', web: 'shelves' }} tintColor={color} size={22} /> }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favoritos', tabBarIcon: ({ color }) => <SymbolView name={{ android: 'favorite_border', ios: 'heart', web: 'favorite_border' }} tintColor={color} size={22} /> }} />
      <Tabs.Screen name="kitchen" options={{ title: 'Mi cocina', tabBarIcon: ({ color }) => <SymbolView name={{ android: 'kitchen', ios: 'house', web: 'kitchen' }} tintColor={color} size={22} /> }} />
    </Tabs>
  );
}
