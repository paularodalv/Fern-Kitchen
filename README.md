# Fern Kitchen

Aplicación Android personal creada con React Native, Expo, TypeScript y Expo Router. La primera fase deja preparadas la navegación, la base local y el acceso a datos; las pantallas funcionales se implementarán después.

## Desarrollo en Android

1. Instala Node.js LTS y ejecuta `npm install`.
2. Ejecuta `npm run start`.
3. Abre Expo Go en un dispositivo Android conectado a la misma red Wi-Fi y escanea el QR.

Para abrirla en un emulador desde esta máquina, instala Android Studio, crea e inicia un emulador y ejecuta `npm run android`.

## APK con EAS Build

Vincula el proyecto a una cuenta de Expo con `npx eas-cli@latest init`. Después genera un APK instalable con `npx eas-cli@latest build --platform android --profile preview`.

## Estructura

- `app/`: rutas y navegación.
- `components/`: componentes reutilizables.
- `features/`: funcionalidades por dominio.
- `database/`: migraciones SQLite y repositorios.
- `services/`: servicios de aplicación, incluidos recordatorios locales.
- `hooks/`, `types/`, `constants/` y `assets/`: piezas compartidas.

La base `fern-kitchen.db` se crea en el dispositivo y aplica las migraciones al iniciar. Las entidades usan UUID y admiten un `userId` opcional como preparación para una posible asociación futura.
