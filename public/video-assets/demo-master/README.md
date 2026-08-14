# Ventora Demo Master

Carpeta para capturas y notas del video maestro vertical.

## Capturas

Generar assets:

```bash
pnpm run video:capture-demo-assets
```

Variables obligatorias, cargadas desde un gestor de secretos o solo en la sesion local:

```bash
VENTORA_DEMO_BASE_URL=https://<host-staging>
VENTORA_DEMO_EMAIL=<usuario-demo-staging>
VENTORA_DEMO_PASSWORD=<secreto-no-versionado>
VENTORA_DEMO_PUBLIC_SLUG=<slug-demo>
VENTORA_DEMO_QUOTE_TOKEN=<token-demo>
```

El script rechaza `ventorap.cl` y sus subdominios. La cuenta debe ser exclusiva de staging, sin datos ni privilegios de produccion. Nunca documentar, versionar ni enviar la contrasena por WhatsApp.

Si `VENTORA_DEMO_PUBLIC_SLUG` o `VENTORA_DEMO_QUOTE_TOKEN` no existen, el script omite esas rutas y documenta el motivo en `capture-report.md`.

## Preview

```bash
pnpm run video:preview:demo-master
```

## Render

```bash
pnpm run video:render:demo-master
```

Salida:

```text
out/ventora-demo-master-vertical.mp4
```

## Si falla Playwright

- Revisar usuario demo.
- Revisar que la cuenta no este vencida.
- Revisar `public/video-assets/demo-master/capture-report.md`.
- Configurar slug/token publico si se necesitan capturas publicas reales.

## Si falla Remotion

- Confirmar que existan las capturas esperadas.
- Si falta una captura publica, generar con variables `VENTORA_DEMO_PUBLIC_SLUG` y `VENTORA_DEMO_QUOTE_TOKEN`.
- Ejecutar `pnpm run lint` para detectar errores TS/React.

## Estado de validacion local

- La validacion historica anterior no cubre este endurecimiento; se debe repetir contra staging con secretos efimeros.
- `pnpm exec remotion still remotion/index.tsx VentoraDemoMasterVertical out/ventora-demo-master-frame-120.png --frame=120 --scale=0.25` es el comando de still recomendado.
- `pnpm run video:render:demo-master` genera `out/ventora-demo-master-vertical.mp4`.
- El render local necesita varios GB libres y tarda alrededor de 20 minutos en esta maquina. El script usa `--concurrency=1 --crf=28` para bajar presion de disco.
- Si Remotion reporta una incompatibilidad de `zod`, alinear las versiones con `pnpm exec remotion add zod` antes de reintentar.
