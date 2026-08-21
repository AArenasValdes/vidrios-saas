# Manual de trabajo multiequipo - Ventora

Estado: vigente  
Actualizado: 2026-08-21  
Responsable: producto + growth + ingeniería

## Objetivo

Trabajar el mismo proyecto Ventora desde Windows y Ubuntu sin perder contexto, secretos ni cambios de marketing.

La fuente compartida es el repositorio Git remoto. El chat no es la fuente de verdad.

## Regla simple

```text
Documentación vigente + Git remoto + Supabase remoto = contexto compartido.
```

No copiar carpetas entre computadores. No enviar `.env.local` por chat, correo ni Git.

## Primera instalación en Ubuntu

1. Instalar Git, Node LTS, Corepack y la CLI de Supabase.
2. Clonar el repositorio en una carpeta de trabajo:

```bash
git clone <URL_DEL_REPOSITORIO> ~/proyectos/vidrios-saas
cd ~/proyectos/vidrios-saas
corepack enable
pnpm install --frozen-lockfile
```

3. Configurar Git para que Linux mantenga finales de línea sanos:

```bash
git config core.autocrlf input
git config pull.ff only
```

4. Crear el entorno local por un canal seguro. Nunca copiar el archivo Windows a mano ni subirlo al repositorio:

```bash
cp .env.example .env.local
```

Completar solo las variables autorizadas desde el gestor de secretos o la configuración segura de Vercel/Supabase. Si no existe `.env.example`, pedir el listado de variables, no valores por chat.

5. Verificar antes de trabajar:

```bash
git status --short --branch
pnpm exec tsc --noEmit
pnpm docs:check
```

## Supabase en Ubuntu

Solo hace falta para cambios de base de datos o pruebas que necesiten datos remotos.

```bash
supabase login
supabase link --project-ref yrtrwgkaopfumpidjthk
supabase migration list
```

Reglas:

- `supabase link` conecta; no cambia la base de datos.
- Nunca ejecutar `supabase db push` por rutina.
- Ejecutarlo solo cuando existe una migración revisada, validada y aprobada para remoto.
- Antes de una migración: `supabase migration list`, revisar diff y confirmar el objetivo.
- Las claves de Supabase siguen fuera de Git.

## Contexto que debe leer cualquier IA

Al abrir Codex en Ubuntu, pegar este prompt una vez por tarea de marketing:

```text
Trabajas en Ventora, repositorio vidrios-saas.

Antes de proponer o cambiar algo, lee en este orden:
1. AGENTS.md
2. docs/README.md
3. AGENTS_MARKETING.md
4. docs/agent-map/README.md
5. docs/VENTORA_MARKETING_OPERATING_SYSTEM.md
6. docs/growth-os/README.md
7. docs/growth-os/MANUAL_TRABAJO_MULTIEQUIPO.md

Si la tarea toca onboarding, lee tambien docs/agent-map/ACTIVATION_ONBOARDING.md.
Si toca producto, usa los mapas de ruta, feature y datos correspondientes.

Verdad comercial:
- Ventora ayuda a cotizar desde celular o computador, enviar PDF profesional por WhatsApp y ordenar precios/cotizaciones.
- En computador se configuran lineas y precios; la pauta es interna y revisable, no un optimizador de cortes.
- No vender ERP, CNC, nesting, cortes exactos ni promesas de ganar clientes.
- Prioridad del embudo: primera cotizacion -> primer PDF -> pago.

Reglas de trabajo:
- No desplegar, hacer push ni migrar la base sin autorizacion explicita.
- No tocar .env.local ni secretos.
- Antes de editar, revisar git status y los documentos canonicos.
- Al cambiar rutas, features, tablas o workflows, actualizar sus mapas y correr pnpm docs:check.

Primero resume: rama, cambios locales, ultimo commit y siguiente paso seguro. Luego espera mi instruccion.
```

## Rutina al cambiar de computador

### Antes de dejar Windows

1. Revisar exactamente qué cambió:

```powershell
git status --short
git diff --check
```

2. Validar solo lo que se tocó. Como mínimo, documentación y tipos si corresponde:

```powershell
pnpm docs:check
pnpm exec tsc --noEmit
```

3. Revisar los archivos a incluir. Nunca usar `git add -A` en un árbol con cambios que no reconoces.
4. Con autorización explícita, crear un commit pequeño con mensaje claro y subirlo al remoto.

```powershell
git add <archivos-revisados>
git commit -m "feat(marketing): descripcion corta"
git push origin main
```

Si no hay autorización para publicar, los cambios siguen solo en ese computador. Ubuntu no los verá.

### Al llegar a Ubuntu

```bash
cd ~/proyectos/vidrios-saas
git status --short --branch
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm docs:check
```

Si `git status` muestra cambios locales, detenerse. No hacer `pull`, `reset`, `checkout --` ni limpieza automática hasta entenderlos.

### Antes de volver a Windows

Repetir la misma rutina. Un solo computador modifica un mismo archivo a la vez.

## Qué se administra dónde

| Tema | Fuente de verdad | No hacer |
|---|---|---|
| Código y documentación | Git remoto | Copiar carpetas entre equipos |
| Marketing y Growth OS | `AGENTS_MARKETING.md` + `docs/growth-os/` | Dejar decisiones solo en el chat |
| Onboarding automático | `/admin/marketing/onboarding` + `docs/agent-map/ACTIVATION_ONBOARDING.md` | Asignar manualmente un video por empresa |
| Base de datos | Migraciones versionadas + Supabase remoto | Ejecutar `db push` sin revisar |
| Secretos | Gestor seguro / variables del proveedor | Subir `.env.local` |
| Estado no publicado | `git status` y `git diff` | Asumir que otro equipo ya lo tiene |

## Rutina de marketing semanal

1. Leer `docs/growth-os/WEEKLY_OPERATING_SYSTEM.md`.
2. Elegir un cuello de botella: atracción, demo, activación o pago.
3. Trabajar un workflow existente, no inventar otro paralelo.
4. Registrar el aprendizaje en el documento canónico afectado.
5. Medir el embudo:

```text
mensajes -> demos -> pruebas -> primera cotizacion -> primer PDF -> pagos
```

Las vistas no son el KPI principal.

## Estado de onboarding actual

El onboarding debe escalar así:

```text
Cuenta creada
  -> /activacion
  -> guía automática según dispositivo
  -> primera cotización
  -> primer PDF o WhatsApp
```

- En celular: mostrar cotización en terreno, PDF y WhatsApp.
- En computador: mostrar líneas/precios y recordar que también puede cotizar desde celular.
- El fundador configura una guía base por dispositivo en `/admin/marketing/onboarding`.
- No se administra cada empresa una por una.

## Si algo no cuadra

1. Detener cambios.
2. Ejecutar `git status --short --branch`.
3. Leer el documento canónico del área.
4. Comparar remoto, migraciones y documentación.
5. Documentar la decisión antes de continuar.

Nunca usar como atajo:

```bash
git reset --hard
git clean -fdx
git checkout -- .
```

## Checklist corto diario

```text
[ ] Estoy en el repo correcto.
[ ] Git está limpio o entiendo cada cambio.
[ ] Leí el contexto de la tarea.
[ ] No expuse secretos.
[ ] No mezclé cambios de dos equipos.
[ ] Validé antes de publicar.
[ ] Lo importante quedó documentado en el repo.
```
