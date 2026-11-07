import type { ImageSourcePropType } from 'react-native';

export type BundledImageId = 'fern_mouse' | 'fern_mouse_photo' | 'app_icon' | 'adaptive_icon_foreground' | 'splash_icon' | 'favicon';

const bundledImages: Record<BundledImageId, ImageSourcePropType> = {
  fern_mouse: require('@/assets/images/fern-mouse.png'),
  fern_mouse_photo: require('@/assets/images/fern-mouse.jpg'),
  app_icon: require('@/assets/images/icon.png'),
  adaptive_icon_foreground: require('@/assets/images/fern-app-icon-foreground.png'),
  splash_icon: require('@/assets/images/splash-icon.png'),
  favicon: require('@/assets/images/favicon.png'),
};

export function getBundledImage(id: string | null | undefined): ImageSourcePropType | null {
  if (!id) return null;
  return Object.hasOwn(bundledImages, id) ? bundledImages[id as BundledImageId] : null;
}
