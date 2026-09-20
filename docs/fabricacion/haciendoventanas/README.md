# Haciendo Ventanas — evidencia técnica

Fecha de consulta: **2026-09-19**  
Fuente: [haceventanas.com](https://www.haceventanas.com/#appMain)  
Estado de acceso: sesión autenticada visible en la aplicación (`alessandroreal2.0@gmail.com`, plan Gratis).

## Alcance

Esta pasada cruza únicamente las 13 coincidencias exactas ya clasificadas entre
Alumétrica y las líneas actuales de Ventora. No se investigaron las 7 candidatas
nuevas de Alumétrica y no se activó ninguna receta.

Las 13 líneas de alcance son: Serie 3200, Óptima S-28 2H/3H, S-38 RPT,
Serie 20, Serie 4800, Serie 5000, S-33, S-33 RPT, Serie 25, AL-15, AL-45,
AM-35 y S60.

## Resultado de cobertura

| Resultado en Haciendo Ventanas | Cantidad | Líneas |
|---|---:|---|
| Familia equivalente visible | 8 | Serie 3200, Serie 4800, Serie 20, Serie 25, Óptima S-28, S-33, S-33 RPT, S-38 RPT |
| No encontrado en selector visible | 5 | AL-15, AL-45, AM-35, Serie 5000, S60 |

La familia Óptima S-28 tiene dos opciones visibles en Haciendo Ventanas: 2 hojas y 3 hojas. Por eso son 8 familias comparadas y 9 opciones de modelo visibles.

## Evidencia y límites

- La evidencia observada fue el selector visible, el formulario de medidas y la
  vista previa real `PDF taller (pauta + presupuesto)` generada por la aplicación.
- Las capturas fueron inspeccionadas en vivo; no se guardó un archivo screenshot
  persistente en el repositorio. Las vistas PDF usaron URLs `blob:` efímeras dentro
  del modal, por lo que no se tratan como enlaces durables.
- La URL durable de consulta es siempre `https://www.haceventanas.com/#appMain`.
- La aplicación muestra resultados de corte para una medida de referencia de
  **1200 × 1000 mm**, barra de **6000 mm** y kerf visible de **3 mm**. Eso es un
  despiece observado, no una fórmula general.
- Si un campo no aparece en la pantalla o el PDF, queda como `falta`, `no
  observado` o `pendiente`; no se completa por inferencia.
- “Aluminio” se conserva como dato de Alumétrica cuando Haciendo Ventanas solo
  expone el nombre de la línea. La FAQ de Haciendo declara soporte para aluminio
  y PVC, pero no reemplaza una identificación específica de material por modelo.

## Clasificación usada

- **coincide**: identidad, código o dato visible equivalente en ambas fuentes.
- **diferencia**: ambas fuentes tienen dato, pero no es igual.
- **falta en Haciendo Ventanas**: Alumétrica tiene el dato y Haciendo no lo expone.
- **falta en Alumétrica**: Haciendo expone el dato y la matriz Alumétrica no lo
  dejó registrado.
- **conflicto**: los datos no pueden elegirse automáticamente; requiere validación
  posterior en Sistema Zeta.

## Separación de datos

- **Observado**: texto visible, código, cantidad, longitud o medida que aparece en
  selector, formulario o PDF.
- **Derivado**: relación de identidad entre la línea Ventora y el modelo mostrado,
  siempre marcada como derivación.
- **Asumido**: no se usa para llenar fórmulas ni recetas. Cuando falta evidencia,
  se mantiene pendiente.

## Estado Ventora

Los documentos de esta carpeta son comparación y evidencia externa. No modifican
`fabrication_recipes`, precios, catálogo comercial ni `docs/fabricacion/zeta/confirmed/*.json`.
Las fórmulas en conflicto quedan para una pasada posterior por Sistema Zeta.
