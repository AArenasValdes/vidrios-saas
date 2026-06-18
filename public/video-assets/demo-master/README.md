# Ventora Demo Master

Carpeta para capturas y notas del video maestro vertical.

## Capturas

Generar assets:

```bash
npm run video:capture-demo-assets
```

Variables opcionales:

```bash
VENTORA_DEMO_BASE_URL=https://www.ventorap.cl
VENTORA_DEMO_EMAIL=admin@test.com
VENTORA_DEMO_PASSWORD=1234
VENTORA_DEMO_PUBLIC_SLUG=<slug-demo>
VENTORA_DEMO_QUOTE_TOKEN=<token-demo>
```

Si `VENTORA_DEMO_PUBLIC_SLUG` o `VENTORA_DEMO_QUOTE_TOKEN` no existen, el script omite esas rutas y documenta el motivo en `capture-report.md`.

## Preview

```bash
npm run video:preview:demo-master
```

## Render

```bash
npm run video:render:demo-master
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
- Ejecutar `npm run lint` para detectar errores TS/React.

## Estado de validacion local

- `npm run video:capture-demo-assets` ejecuto correctamente con capturas autenticadas.
- `npx remotion still remotion/index.tsx VentoraDemoMasterVertical out/ventora-demo-master-frame-120.png --frame=120 --scale=0.25` ejecuto correctamente.
- `npm run video:render:demo-master` ejecuto correctamente y genero `out/ventora-demo-master-vertical.mp4`.
- El render local necesita varios GB libres y tarda alrededor de 20 minutos en esta maquina. El script usa `--concurrency=1 --crf=28` para bajar presion de disco.
- Remotion muestra warning de version: `zod` instalado `3.25.76`, requerido `4.3.6`. Si aparece una falla no relacionada a disco, ejecutar `npx remotion add zod` o alinear versiones Remotion antes de reintentar.
