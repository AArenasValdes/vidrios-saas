# Contrato técnico común de recetas

Estado: vigente desde 2026-09-18.

Este contrato separa la identidad que selecciona una receta de los datos comerciales que solo acompañan una cotización. Una receta no puede activarse si no declara su familia, sus discriminadores obligatorios y los gates técnicos ejecutados.

## Impactos de inputs

| Input | Comercial solamente | Geometría | Perfiles | Vidrio | Accesorios | Mecanizado | Regla vigente |
|---|---:|---:|---:|---:|---:|---:|---|
| Cliente, contacto, notas comerciales, precio, descuento, margen, moneda | Sí | No | No | No | No | No | Nunca participan en el resolver |
| Cantidad de unidades | Sí | No | No | No | No | No | Escala la salida, no identifica la receta unitaria |
| Línea técnica / `lineTemplateId` | No | No | Sí | Sí | No | No | Selecciona sistema y catálogo |
| Tipología | No | Sí | No | No | No | No | Define la composición base |
| `topology` | No | Sí | Sí | Sí | No | No | Opcional; obligatorio solo si distingue familias |
| Ancho y alto | No | Sí | Sí | Sí | No | No | Siempre van en el caso de cálculo |
| Hojas / esquema de hojas | No | Sí | Sí | Sí | Sí | No | Discriminador técnico cuando cambia el despiece |
| Vidrio, cámara, espesor y terminación | No | No | Sí | Sí | No | No | Solo se pide cuando cambia la fabricación |
| Pierna, apertura constructiva y refuerzo | No | No | Sí | No | No | No | Discriminadores de familia L25 observados en Zeta |
| `herraje` / manilla | No | No | No | No | Sí | No | No es variante si solo cambia el listado de accesorios |
| `hardwareMode` | No | No | No | No | Sí | Solo si aplica | Opcional; no requerido por L25 |
| Color o terminación de perfil | No | No | Sí | No | No | No | Solo será discriminador si cambia código o material |
| Pérdida, despunte y largo comercial | No | No | No | No | No | Sí | Afectan pauta de barras, no largo neto observado |

## Discriminadores de SODAL L25

**Estado 2026-09-19: PRODUCTION READY.** Closeout: `docs/fabricacion/L25_PRODUCTION_CLOSEOUT.md`.

L25 declara la familia `sodal:l25` y exige `lineTemplateId`, `typology`, `topology`, `leaves`, `glazing`, `leg` y `reinforcement`. `topology` queda fijada como `corredera`. `hardwareMode` permanece nulo porque el herraje no crea una receta distinta en la evidencia confirmada.

Las seis familias canónicas son **18 recetas** (2H/3H/4H × 6 combinaciones admitidas). Hay **22 evidencias** Zeta confirmed (18 canónicas + 4 observaciones extra 3H @ 2400×1500). No soportado: pierna cerrada + reforzada (monolítico o DVH). Este contrato no agrega líneas ni nuevas combinaciones.

Los 6 gates de activación están aprobados en las 18 recetas canónicas (`sodal-l25-zeta-recipes.test.ts`).

## Gates de activación

Una receta solo puede pasar a `validated` cuando todos estos gates están aprobados:

1. `source_exact`: fuente y referencia exactas, además del contrato técnico.
2. `distinct_geometry`: al menos dos geometrías distintas en tests obligatorios aprobados.
3. `role_invariants`: ancho y alto cambian o permanecen invariantes según la base de cada regla.
4. `resolver_unique`: una sola receta activa para la identidad técnica.
5. `snapshot_despiece_pauta_e2e`: cubicación, snapshot, despiece y pauta de barras calculables.
6. `accessories_hardware_classified`: cada accesorio declara rol e impactos técnicos.

La evidencia observada de Zeta sigue separada de las fórmulas derivadas. Este endurecimiento no modifica ningún JSON de `docs/fabricacion/zeta/confirmed/`.
