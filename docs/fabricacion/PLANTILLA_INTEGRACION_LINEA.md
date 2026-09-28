# Expediente de integración de línea

Copiar este archivo a la carpeta de evidencia correspondiente y completar antes del cierre. Guía: [workflow de integración](WORKFLOW_INTEGRAR_NUEVA_LINEA.md).

## Identidad y alcance

- Proveedor / línea / `catalog_key`:
- Fuente original, revisión, archivo y hash si se conserva localmente:
- Estado inicial del código y cambios previos que deben preservarse:
- Variantes solicitadas y variantes explícitamente fuera de alcance:
- Salida: cotizable / preliminar calculable / bloqueada por dato geométrico / validada por taller:

## Matriz de reglas y ejemplos independientes

Una fila por variante y rol. Expresar todas las medidas de prueba en mm. No obtener el valor esperado llamando al mismo motor bajo prueba.

| Variante estable | Tipología / hojas / riel / vidrio | Fuente: página o pestaña y celda | Rol / código / ángulo | Fórmula y cantidad | Entrada A → resultado | Entrada B → resultado | Pendiente y efecto |
|---|---|---|---|---|---|---|---|
| Completar | Completar | Completar | Completar | Completar | Completar | Completar | Completar |

Registrar redondeo, largos de barra, kerf, umbrales y unidades con su propia procedencia. Una fórmula derivada debe declararse como tal. Para cada rama condicional, incluir un caso antes, en y después del umbral.

## Recorrido de integración

| Tramo | Archivo / identidad concreta | Evidencia de que funciona |
|---|---|---|
| Fixture y reglas | | |
| Catálogo y slots | | |
| Seed por organización y reintento | | |
| Selector guiado y Constructor | | |
| Vidrio final y entradas adicionales | | |
| Resolver por línea, tipología, hojas y variante | | |
| Snapshot, guardado y reapertura | | |
| Despiece y barras | | |
| Impresión interna y PDF cliente | | |

## Pruebas exigibles

- [ ] Todas las variantes del alcance tienen prueba numérica y procedencia; las excluidas se identifican sin inventar equivalencias.
- [ ] Dos geometrías válidas, cantidad mayor que uno, cero/negativos y límites relevantes.
- [ ] Selección por identidad exacta; vidrio final soportado y no soportado; entrada adicional ausente/inválida.
- [ ] Cambiar línea, vidrio, geometría o medida invalida el cálculo vivo correspondiente.
- [ ] Receta propia calculable conserva sus ajustes; seeds no reemplazan recetas editadas/probadas.
- [ ] Otra organización, otra línea, archivados y eliminados no intervienen en la selección.
- [ ] Snapshot histórico permanece congelado; recálculo nuevo solo por la acción prevista.
- [ ] Barras conservan piezas y no mezclan perfiles incompatibles; largos imposibles se advierten.
- [ ] Estado preliminar y aviso visible; pasar tests no cambia validación de taller.
- [ ] `pnpm fabrication:verify` aprobado; si hay fallos, describirlos y no cerrar como aprobado.
- [ ] Build cuando se cambia aplicación; smoke de navegador según recorrido inferior.

Tests numéricos en `src/features/fabricacion/__tests__/<linea>-numerical-contract.test.ts`; regresiones del recorrido en las suites del servicio, hook o componente afectado. Referencia real: `winhouse-s75-numerical-contract.test.ts`. El verificador los incluye sin editar una lista de comandos.

## Smoke de navegador

Usar una cuenta QA ya autorizada y datos identificados como prueba. No guardar credenciales en este expediente ni en tests.

| Variante / dimensiones / vidrio | Ruta real e ítem QA | Resultado esperado vs observado | Guardado y reapertura | Pauta interna / PDF cliente | Evidencia o bloqueo |
|---|---|---|---|---|---|
| Completar | Completar | Completar | Completar | Completar | Completar |

Para declarar toda la línea integrada, recorrer todas las configuraciones nuevas en cotización. Automatizar mediante casos de UI cuando sea estable; si se muestrea, declarar exactamente qué quedó sin recorrer. Los tests del motor no sustituyen esta cobertura.

## Entrega

- Comando, fecha, commit y cambios locales de la ejecución:
- Informe `test-results/fabrication/verification.json` (generado, no versionar):
- Pruebas automáticas / navegador / build: aprobado, fallido o no ejecutado por separado:
- Variantes calculables y bloqueadas con motivo concreto:
- Escrituras realizadas en cuenta QA; base remota, migraciones y despliegue si los hubo:
- Archivos y documentación actualizados; riesgos reales y siguiente paso:
