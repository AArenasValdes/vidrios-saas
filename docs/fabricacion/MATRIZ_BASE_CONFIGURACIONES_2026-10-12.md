# Inventario de la base de configuraciones — 2026-10-12

Estado: fotografía local de los fixtures; diagnóstico para la [propuesta de base común](BASE_COMUN_LINEAS_SISTEMAS_COMPOSICIONES.md).

## Alcance

Se cargaron las funciones puras `VENTORA_DEFAULT_LINE_CATALOG`, `getLineVariantSlots` y `getVentoraProfileReferencesForCatalogKey`. No se consultó Supabase ni se ejecutaron operaciones de guardado. Las claves identifican entradas comerciales, no necesariamente familias distintas.

- Total: 73 entradas.
- Declaración de compatibilidad: 4 con pares explícitos; 39 con formato anterior; 30 sin declaración en ese objeto.
- Slots del catálogo técnico consultado: 28 entradas con slots y 45 sin slots.
- Referencias de perfiles: 54 entradas con referencias y 19 sin referencias en ese fixture.

**Una entrada sin slots puede tener recetas en otros fixtures/arquetipos o recetas propias.** L25, por ejemplo, tiene un catálogo especializado de 18 variantes que no se cuenta con los tres slots genéricos. Esta matriz mide fragmentación de registros, no cantidad de líneas sin despiece. La revisión de recetas por organización y de todas las fuentes documentales queda fuera de este inventario.

## Entradas actuales

“Anterior” significa listas `componentTypes`/`openingTypes`/`leavesCounts`; no indica por sí solo incompatibilidad. “Sin declaración” significa ausencia del objeto `compatibility`, no ausencia de conocimientos en otros módulos. Los números de referencias no acreditan asociación a una composición.

| Clave canónica | Nombre | Declaración comercial | Slots | Referencias de perfil |
|---|---|---|---:|---:|
| ventora:l5000 | Serie 5000 | Sin declaración | 1 | 7 |
| ventora:l20 | Serie 20 | Sin declaración | 1 | 7 |
| ventora:l25 | Serie 25 | Sin declaración | 3 | 7 |
| ventora:l32 | AL-32 | Sin declaración | 1 | 5 |
| ventora:l35 | AM-35 · Puerta abatible y vaivén | Sin declaración | 0 | 8 |
| ventora:serie-15-corredera-2h | Línea 15 — Corredera 2 hojas | Sin declaración | 4 | 7 |
| ventora:serie-4000-corredera-2h | Línea 4000 — Corredera 2 hojas | Sin declaración | 4 | 7 |
| ventora:serie-45-puerta | Línea 45 — Puerta | Sin declaración | 0 | 3 |
| ventora:serie-12-shower-corredera | Línea 12 — Shower Door | Sin declaración | 0 | 4 |
| ventora:l42 | AL-42 | Sin declaración | 4 | 10 |
| ventora:serie-4800-corredera-2h | Serie 4800 — Corredera 2 hojas | Sin declaración | 2 | 9 |
| ventora:veratec-bahar-5200-fijo | Bahar 5200 · Paño fijo | Anterior | 1 | 10 |
| ventora:veratec-bahar-5200-ventana-interior | Bahar 5200 · Ventana hoja interior | Anterior | 1 | 10 |
| ventora:veratec-bahar-5200-ventana-exterior | Bahar 5200 · Ventana hoja exterior | Anterior | 2 | 10 |
| ventora:veratec-bahar-5200-plegable-3-3-0 | Bahar 5200 · Plegable 3/3/0 | Anterior | 1 | 10 |
| ventora:veratec-bahar-5200-plegable-4-3-1 | Bahar 5200 · Plegable 4/3/1 | Anterior | 1 | 10 |
| ventora:veratec-bahar-5200-plegable-6-5-1 | Bahar 5200 · Plegable 6/5/1 | Anterior | 1 | 10 |
| ventora:veratec-bahar-5200-plegable-7-4-3 | Bahar 5200 · Plegable 7/4/3 | Anterior | 1 | 10 |
| ventora:veratec-7400-corredera | Veratec 7400 — Corredera 2 hojas | Anterior | 3 | 15 |
| ventora:veratec-7400-corredera-3h | Veratec 7400 — Corredera 3 hojas | Anterior | 2 | 15 |
| ventora:veratec-7400-corredera-4h-chica | Veratec 7400 — Corredera 4 hojas chicas | Anterior | 1 | 0 |
| ventora:veratec-7400-monorriel | Veratec 7400 — Corredera monorriel | Anterior | 2 | 15 |
| ventora:veratec-elegans-60-ventana-hoja-exterior | Ventana · hoja exterior | Anterior | 0 | 11 |
| ventora:veratec-elegans-60-ventana-hoja-interior | Ventana · hoja interior | Anterior | 0 | 11 |
| ventora:veratec-elegans-60-puerta-hoja-exterior | Puerta · hoja exterior | Anterior | 0 | 11 |
| ventora:veratec-elegans-60-puerta-hoja-interior | Puerta · hoja interior | Anterior | 0 | 11 |
| ventora:veratec-elegans-60-fijo | Paño fijo | Anterior | 0 | 11 |
| ventora:veratec-compact-sliding-2h | Compact Sliding · 2 hojas | Anterior | 1 | 6 |
| ventora:veratec-compact-sliding-3h | Compact Sliding · 3 hojas | Anterior | 1 | 6 |
| ventora:veratec-compact-sliding-4h | Compact Sliding · 4 hojas | Anterior | 1 | 6 |
| ventora:veratec-inova-corredera-2h | Inova · Corredera representada | Anterior | 1 | 10 |
| ventora:veratec-elevadora-2h-1fijo-1movil | Elevadora · 2 paños · 1 fijo + 1 móvil | Anterior | 1 | 0 |
| ventora:veratec-elevadora-2h-2moviles | Elevadora · 2 paños · 2 móviles | Anterior | 0 | 0 |
| ventora:veratec-elevadora-3h-2fijos-1movil | Elevadora · 3 paños · 2 fijos + 1 móvil | Anterior | 0 | 0 |
| ventora:veratec-elevadora-3h-1fijo-2moviles | Elevadora · 3 paños · 1 fijo + 2 móviles | Anterior | 0 | 0 |
| ventora:veratec-elevadora-4h-4moviles | Elevadora · 4 paños · 4 móviles | Anterior | 0 | 0 |
| ventora:veratec-elevadora-4h-2fijos-2moviles | Elevadora · 4 paños · 2 fijos + 2 móviles | Anterior | 1 | 0 |
| ventora:veratec-eko-130 | EKO 130 | Sin declaración | 0 | 8 |
| ventora:veratec-eko-82 | EKO 82 | Sin declaración | 0 | 8 |
| ventora:veratec-inova-76-junta-central | Veratec Inova 76 · Junta central | Anterior | 0 | 0 |
| ventora:veratec-inova-76 | Veratec Inova 76 | Anterior | 0 | 0 |
| ventora:veratec-inova-nueva-generacion | Veratec Inova · Corredera nueva generación | Anterior | 0 | 0 |
| ventora:veratec-maxi-royal-70 | Veratec Maxi Royal 70 | Anterior | 0 | 0 |
| ventora:veratec-elegans-70 | Veratec Elegans 70 | Anterior | 0 | 0 |
| ventora:veratec-maxi-riviera | Veratec Maxi Riviera | Anterior | 0 | 0 |
| ventora:veratec-maxi-majestic | Veratec Maxi Majestic | Anterior | 0 | 0 |
| ventora:veratec-maxi-empire | Veratec Maxi Empire | Anterior | 0 | 0 |
| ventora:veratec-diamond-60 | Veratec Diamond 60 | Anterior | 0 | 0 |
| ventora:veratec-lineal-sliding-74 | Veratec Corredera Lineal 74 | Anterior | 0 | 0 |
| ventora:veratec-lineal-sliding-70 | Veratec Corredera Lineal 70 | Anterior | 0 | 0 |
| ventora:veratec-compact-lineal-sliding-60 | Veratec Corredera Lineal Compacta 60 | Anterior | 0 | 0 |
| ventora:optima-s28-corredera-2h | Óptima S-28 — Corredera 2 hojas | Sin declaración | 0 | 5 |
| ventora:optima-s28-corredera-3h | Óptima S-28 — Corredera 3 hojas | Sin declaración | 0 | 5 |
| ventora:s33-corredera-2h | S-33 — Corredera 2 hojas | Sin declaración | 0 | 5 |
| ventora:s33-rpt-corredera-2h | S-33 RPT — Corredera 2 hojas | Sin declaración | 0 | 5 |
| ventora:serie-42-proyectante-camara | Serie 42 — Proyectante con cámara | Sin declaración | 0 | 10 |
| ventora:serie-42-proyectante-sin-camara | Serie 42 — Proyectante sin cámara | Sin declaración | 0 | 10 |
| ventora:s38-proyectante | S-38 — Proyectante | Sin declaración | 0 | 7 |
| ventora:s38-rpt-proyectante | S-38 RPT — Proyectante y paño fijo | Anterior | 0 | 5 |
| ventora:multislide-s83-4h | MultiSlide S-83 — 4 hojas | Sin declaración | 0 | 4 |
| ventora:multislide-s83-8h | MultiSlide S-83 — 8 hojas | Sin declaración | 0 | 4 |
| ventora:serie-3200-puerta-abatible-1h | Serie 3200 — Puerta abatible 1 hoja | Sin declaración | 0 | 5 |
| ventora:serie-4600-puerta-vaiven | Serie 4600 — Puerta vaivén | Sin declaración | 0 | 4 |
| ventora:kompen-prime-line-700 | Prime Line KOM 700 | Pares explícitos | 0 | 17 |
| ventora:kompen-form-line-800 | Form Line KOM 800 | Pares explícitos | 0 | 21 |
| ventora:kompen-star-line-500 | Star Line KOM 500 | Pares explícitos | 0 | 7 |
| ventora:thermowin-americana-s70 | Americana PVC S-70 TW | Pares explícitos | 0 | 12 |
| ventora:winhouse-new-s75-doble-riel | WinHouse New S75 — Doble riel | Sin declaración | 30 | 34 |
| ventora:winhouse-new-s75-triple-riel | WinHouse New S75 — Triple riel | Sin declaración | 6 | 35 |
| ventora:winhouse-s60 | WinHouse S60 | Sin declaración | 8 | 10 |
| ventora:winhouse-andes-doble-riel | WinHouse Andes — Doble riel | Sin declaración | 0 | 6 |
| ventora:winhouse-andes-monorriel | WinHouse Andes Monorriel | Sin declaración | 0 | 6 |
| ventora:winhouse-andes-proyectante | WinHouse Andes — Proyectante | Sin declaración | 0 | 6 |

## Uso durante la implementación

Resolver cada fila contra sus recetas y documentos reales antes de migrarla. Registrar en el contrato común tanto las composiciones conocidas como los campos por confirmar. No convertir esta tabla en un seed de perfiles ni en permisos de apertura por defecto. Conservar los IDs comerciales actuales y las recetas/ajustes del taller.
