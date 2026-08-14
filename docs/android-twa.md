# Android TWA para Ventora

Ventora se publicara en Google Play como Trusted Web Activity (TWA) usando Bubblewrap. No publicar APK por fuera de Play Store ni promover descargas externas.

## Estado PWA

- Produccion canonica: `https://www.ventorap.cl`.
- Manifest: `/manifest.webmanifest`.
- Service worker: `/sw.js`, registrado solo en produccion y host canonico.
- Rutas privadas, APIs, PDF y WhatsApp no quedan cacheadas como navegacion offline. El service worker solo intercepta navegacion publica de app shell: `/`, `/login`, `/planes`, `/offline`; las APIs se saltan.
- Iconos requeridos: `192x192`, `512x512`, `192x192 maskable`, `512x512 maskable`.

## Digital Asset Links

Endpoint publico:

```text
https://www.ventorap.cl/.well-known/assetlinks.json
```

Variables requeridas en produccion antes de validar la TWA:

```bash
ANDROID_TWA_PACKAGE_NAME=cl.ventorap.app
ANDROID_TWA_SHA256_CERT_FINGERPRINTS=AA:BB:CC:...
```

`ANDROID_TWA_SHA256_CERT_FINGERPRINTS` acepta una o mas huellas SHA-256 separadas por coma o salto de linea. Sin huella configurada, el endpoint devuelve `[]` para no declarar confianza falsa.

## Bubblewrap

Instalar y preparar:

```bash
pnpm add -g @bubblewrap/cli
bubblewrap doctor
bubblewrap init --manifest https://www.ventorap.cl/manifest.webmanifest
```

Valores esperados:

```text
Package ID: cl.ventorap.app
App name: Ventora
Launcher name: Ventora
Host: www.ventorap.cl
Start URL: /dashboard
Display mode: standalone
Orientation: portrait
```

## Keystore y huella

Generar keystore de firma si no existe:

```bash
keytool -genkeypair -v -keystore ventora-release.keystore -alias ventora -keyalg RSA -keysize 2048 -validity 10000
```

Obtener SHA-256:

```bash
keytool -list -v -keystore ventora-release.keystore -alias ventora
```

Copiar `SHA256` a `ANDROID_TWA_SHA256_CERT_FINGERPRINTS`, desplegar produccion y verificar:

```bash
curl https://www.ventorap.cl/.well-known/assetlinks.json
```

## Build Android

```bash
bubblewrap build
```

Generar AAB para Play Console:

```bash
./gradlew bundleRelease
```

Subir el `.aab` firmado a Google Play Console. No distribuir APK externo a maestros.

## Play Console

1. Crear app Android en Google Play Console.
2. Usar package ID `cl.ventorap.app`.
3. Subir AAB firmado.
4. Completar ficha, privacidad, seguridad de datos y contenido.
5. Validar que Digital Asset Links pase con `www.ventorap.cl`.
6. Publicar primero en testing interno/cerrado.

## QA minimo antes de publicar

- Abrir `/login` y entrar con usuario valido.
- Confirmar redirect a `/dashboard`.
- Probar `/cotizaciones`, detalle, PDF y accion WhatsApp.
- Probar que `/presupuesto/[token]` funciona fuera de sesion.
- Probar que `/solicitud/[empresa]` sigue captando leads.
- Confirmar que no aparece copy de APK o descarga externa.
