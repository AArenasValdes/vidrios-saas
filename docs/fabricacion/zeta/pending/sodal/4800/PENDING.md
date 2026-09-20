# SODAL / Serie 4800 — cola Zeta

Pendientes de evidencia directa mediante Plan de armado. La pauta documental SODAL existente no se copia a `confirmed/`.

| Fabricante | Sistema | Línea | Hojas | Medida | Código vidrio | Estado | Motivo |
|---|---|---|---:|---|---|---|---|
| SODAL | 4800 | L-4800 MONOLITICO | 2H | 1800 × 1500 | CTI5 | pending | Extraer Plan de armado real |
| SODAL | 4800 | L-4800 MONOLITICO | 3H | 3000 × 1500 | CTI5 | pending | Extraer Plan de armado real |
| SODAL | 4800 | L-4800 MONOLITICO | 4H | 3000 × 1500 | CTI5 | pending | Zeta mostró `No se ha encontrado la línea de productos`; no se generó Plan de armado |

## Diagnóstico de 4H

- Proyectos de prueba Zeta: `46410`, `46414` y reintento limpio `46415`.
- Configuración observada: `L-4800 MONOLITICO | SODAL`, `Estandar - L-4800 MONOLITICO`, `BLANCO`, `CTI5`, `3000 × 1500 mm`.
- Avisos observados: `La linea L-4800 MONOLITICO no tiene perfiles para extensiones`; `No se ha encontrado el producto para el perfil adaptador`.
- Resultado final: el mismo bloqueo se repitió en `46414` y `46415`; no se generó Plan de armado.
- Clasificación: `ERROR DE ZETA / NO PROBADA`; no equivale a `RECETA NO EXISTE`.
