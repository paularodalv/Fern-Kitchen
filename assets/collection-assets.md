# Collection asset conventions

Collection art is local and optional. Screens render the catalog icon and a quiet silhouette when an image has not been supplied, so missing illustrations never block the offline experience.

Use PNG files with transparent backgrounds for stickers and cosmetics. Keep each sticker file at a square aspect ratio and name it with the stable sticker ID from `features/collection/catalog.ts`.

```text
assets/
  stickers/
    bakery/bread-loaf.png
    pastry/little-whisk.png
    fermentation/starter-jar.png
    preserves/preserve-jar.png
    ingredients/garden-tomato.png
    seasons/autumn-leaf.png
    special/mouse-apron.png
  cosmetics/
    frames/
    backgrounds/
    accessories/
  recipe-designs/
  events/
  achievements/
```

When adding art, update the matching `assetPath` in the local catalog. Do not use remote URLs or construct image paths dynamically in a screen. Register new achievements, rewards, designs and dated event challenges in the same catalog; stable IDs are persisted in SQLite and should not be renamed after release.

The current sticker catalog uses local asset references with icon fallback art. The official mouse asset at `assets/images/fern-mouse.png` is used for the profile preview and cooking celebration.
