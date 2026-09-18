# Prueba local de Sistema Zeta

Este directorio usa una sesión autenticada separada para pruebas de Zeta.

Ejecutar desde la raíz del repositorio:

```powershell
node tools/zeta-playwright/smoke.mjs
```

El smoke test solo abre `https://sistemazeta.cl/zeta/`, registra respuestas HTTP fallidas y guarda una captura local. No crea proyectos ni modifica configuraciones.

`zeta-auth.json`, `downloads/` y `artifacts/` quedan ignorados por Git porque pueden contener sesión o evidencia local.

Para iniciar la sesión persistente de Zeta sin usar la terminal interactiva:

```powershell
node tools/zeta-playwright/bootstrap-profile.mjs
```

El navegador se cierra solo después de detectar que el login terminó. La sesión queda en `.zeta-profile/`.
