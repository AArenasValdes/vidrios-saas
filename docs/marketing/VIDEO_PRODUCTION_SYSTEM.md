# Sistema de producción de videos - Ventora

Estado: vigente  
Actualizado: 2026-09-01

Este es el sistema reutilizable para grabar, editar, publicar y medir videos de Ventora. La regla es simple: misma marca, una sola promesa por pieza y datos suficientes para decidir qué repetir.

## Templates oficiales

| Template | Formato | Duración | Uso | CTA |
|---|---:|---:|---|---|
| `OnboardingMobile` | 9:16 | 60–75 s | Primera cotización desde celular: cliente → pieza → PDF/WhatsApp | `Crea tu primera cotización` |
| `OnboardingPcEnhancement` | 16:9 | Master completo; recorte posterior opcional | Continuidad en PC: Constructor → líneas → despiece → cubicación/pauta revisable | `Continúa tu cotización en computador` |
| `FeatureShort` | 9:16 | 25–45 s | Un dolor y una función: PDF, clientes, líneas o seguimiento | `Escríbeme DEMO` |
| `DemoProof` | 16:9 | 45–75 s | Demo completa para una conversación comercial | `Te muestro una cotización real` |

Los templates viven en `src/features/video/`. El template PC actual usa `DesktopAppFrame.tsx` + `ProductCamera.tsx` + `OnboardingPcEnhancement.tsx`: el footage real va dentro de un marco Ventora, sin chrome del navegador, y el master se mantiene estable para que el recorte posterior no deforme la lectura. Las variantes futuras pueden activar focos controlados desde `ProductCamera.tsx`.

## Sistema visual fijo

- Logo oficial: `public/brand/ventora-logo-premium-dark.svg`.
- Tipografía: Space Grotesk local, sin depender de internet.
- Paleta: `#050505`, `#0B0F17`, `#111827`, `#1E88FF`, `#E6E8EB`, `#8A96A6`.
- Pantalla real dentro de marco oscuro, con borde fino y sombra sobria.
- Rótulo inferior: número de paso, acción concreta y una sola frase de apoyo.
- Audio original silenciado en el master. La voz y subtítulos se agregan después.
- Subtítulos: alto contraste, máximo 8 palabras por bloque.

## Flujo operativo por video

1. Duplicar la fila correspondiente en `PLANILLA_CONTENIDO_VENTORA.csv`.
2. Definir un solo dolor, un solo resultado y un CTA.
3. Grabar con cuenta y datos ficticios. Nunca usar clientes, teléfonos, correos o links reales.
4. Elegir el template según formato y objetivo. Cortar esperas, cargas y repeticiones.
5. Revisar privacidad cuadro a cuadro y aplicar máscaras antes de exportar.
6. Renderizar el master sin voz, grabar la voz con el guion y añadir subtítulos.
7. Exportar 9:16 para Reels/TikTok/Stories y 16:9 para onboarding PC o demo.
8. Publicar con UTM única en `utm_source`, `utm_medium`, `utm_campaign` y `utm_content`.
9. Completar métricas a las 24 h, 72 h y 7 días. Anotar un aprendizaje y la próxima acción.

## Orden del paquete de onboarding

1. Video móvil: crear primera cotización y enviar PDF profesional.
2. Video PC: continuar en Constructor, elegir/configurar línea y revisar cubicación, despiece y pauta.
3. Video de PDF + WhatsApp: solo después de que el usuario haya creado una cotización.
4. Videos de líneas y recetas: ayuda contextual, no requisito para comenzar.

El Constructor en computador es el flujo recomendado para esta pieza. La cubicación, el despiece y la pauta son referencias internas configuradas y revisables por el taller; no se comunican como cortes exactos automáticos, optimización, CNC ni fabricación autónoma.

## Métricas mínimas

- Alcance y reproducciones de 3 segundos.
- Retención al 25%, 50%, 75% y 95%.
- Clics en CTA y conversaciones con `DEMO`.
- Registros iniciados y primera cotización creada.
- Para onboarding: video visto, primera cotización creada y PDF generado.

La métrica de éxito no es solo visualización: es que el maestro llegue a su primera cotización y la envíe.
