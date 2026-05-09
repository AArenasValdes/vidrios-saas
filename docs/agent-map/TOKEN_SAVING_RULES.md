# Token Saving Rules - Ventora

Reglas para que agentes de codigo minimicen el gasto de tokens al trabajar en este proyecto.

---

## Regla 1: Buscar primero en docs/agent-map/

Antes de explorar el proyecto, leer el archivo correspondiente del mapa tecnico. No abrir 20 archivos para entender donde esta algo que ya esta documentado.

| Tipo de tarea | Archivo a leer primero |
|---|---|
| Modificar una ruta | `ROUTES_MAP.md` |
| Modificar una feature | `FEATURES_MAP.md` |
| Modificar persistencia/DB | `DATA_MODEL_MAP.md` |
| Modificar un componente | `COMPONENTS_MAP.md` |
| Tarea generica | `AGENT_TASK_GUIDE.md` |

---

## Regla 2: Revisar solo los archivos indicados por feature

Cada seccion de `FEATURES_MAP.md` lista exactamente los archivos principales, donde editar UI, donde editar logica y donde editar persistencia. No explorar mas alla de esa lista salvo que sea estrictamente necesario.

---

## Regla 3: Usar busquedas precisas

- Buscar por nombre de componente, ruta o tabla especifica
- No hacer `grep` de patrones genericos como `import` o `from`
- No buscar en `node_modules/`, `.next/`, `public/`
- Preferir `grep` con patron especifico sobre `glob` amplio

---

## Regla 4: No explorar carpetas enteras

Si ya existe un mapa para la feature, no listar ni leer todos los archivos de la carpeta. El mapa ya indica cuales son relevantes.

---

## Regla 5: No leer archivos completos innecesariamente

- Si necesitas saber que exporta un archivo, leer las primeras 10-30 lineas
- Si necesitas una funcion especifica, buscar por nombre con grep
- Si necesitas entender un tipo, leer solo el archivo de tipos
- No leer archivos de 1000+ lineas completos si solo cambias una funcion

---

## Regla 6: Ir directo a src/features/, no a los re-exports

Los directorios `src/hooks/`, `src/services/`, `src/repositories/`, `src/types/` contienen solo re-exports legacy. No leerlos ni editarlos. Ir directo a `src/features/<feature>/`.

---

## Regla 7: Antes de tocar una feature, leer su seccion

Cada feature en `FEATURES_MAP.md` incluye:
- Archivos principales
- Donde editar UI
- Donde editar logica
- Donde editar persistencia
- Riesgos al modificar

Leer esto antes de abrir cualquier archivo de codigo.

---

## Regla 8: Actualizar la documentacion cuando se modifica el proyecto

| Accion | Documento a actualizar |
|---|---|
| Agregar ruta nueva | `ROUTES_MAP.md` + `FEATURES_MAP.md` |
| Mover un archivo | Todos los mapas donde aparezca |
| Cambiar tabla o query | `DATA_MODEL_MAP.md` |
| Crear componente reutilizable | `COMPONENTS_MAP.md` |
| Cambiar feature existente | `FEATURES_MAP.md` |
| Decision tecnica relevante | `CHANGELOG_AGENT_MAP.md` |

---

## Regla 9: Registrar decisiones tecnicas

Cuando se tome una decision tecnica que afecte la arquitectura o el mapa, agregar una entrada en `CHANGELOG_AGENT_MAP.md` con fecha, decision y razon.

---

## Regla 10: No reintroducir patrones legacy

- No crear nuevos archivos en `src/hooks/`, `src/services/`, `src/repositories/`, `src/types/`
- Crear nuevos archivos en `src/features/<feature>/`
- No reactivar tablas legacy sin instruccion explicita
- No reintroducir cotizador tecnico como centro del producto

---

## Resumen: flujo optimo para cualquier tarea

```
1. Leer AGENTS.md (reglas generales)
2. Leer seccion correspondiente en docs/agent-map/
3. Leer SOLO los archivos indicados en el mapa
4. Hacer cambios minimos y especificos
5. Ejecutar lint + build + test
6. Actualizar mapa si la estructura cambio
```
