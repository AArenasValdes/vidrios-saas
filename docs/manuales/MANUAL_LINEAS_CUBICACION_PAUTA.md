# Manual corto: líneas, cubicación y pauta de corte

Para maestros / dueños de taller que configuran Ventora.  
 ide a: **5–10 minutos** la primera vez.

---

## 1. Tres ideas simples (léelas una sola vez)

| Qué | Para qué sirve | ¿Obligatorio? |
|---|---|---|
| **Línea** | El producto que vendes y su **precio** (ej. “Corredera blanca 25”) | Sí, para cotizar |
| **Partida de estimación** | Cómo Ventora **calcula materiales** (solo 3 tipos) | No |
| **Pauta de corte** | La tabla de perfiles/vidrio/accesorios que ves al cotizar | No |

- Cotizar el precio **no requiere** cubicación.
- La partida **no** es el nombre comercial de la ventana. Es solo el patrón de cálculo.
- Trabajos raros o complejos se arman en el **constructor**, no inventando más partidas.

**Las únicas 3 partidas:**

1. **Paño fijo**
2. **Corredera 2 hojas**
3. **Puerta abatible 1 hoja**

---

## 2. Dónde se configura

1. Entra a Ventora (computador).
2. Ve a **Configuración → Empresa**.
3. Abre **Líneas y precios** (o “Líneas y precios base”).

Ahí se crean y editan las líneas del taller.

---

## 3. Cómo agregar una línea (precio)

1. Pulsa **Nueva línea** (o equivalente).
2. Completa lo básico:
   - **Nombre** (como lo reconocen en el taller)
   - **Categoría / material** si aplica
   - **Precio por m²**
   - **Mínimo cobrable** y **redondeo** (si los usan)
3. Déjala **activa**.
4. **Guarda**.

Con esto ya puedes cotizar esa línea. La cubicación es el paso siguiente, opcional.

---

## 4. Cómo activar cubicación y pauta (opcional)

En la misma ficha de la línea:

1. Activa **Estimación V1** / estimación de materiales.
2. Elige la **Partida de estimación** que más se parezca a cómo fabrican esa línea:
   - Fijo → **Paño fijo**
   - Ventana corredera de 2 hojas → **Corredera 2 hojas**
   - Puerta de 1 hoja → **Puerta abatible 1 hoja**
3. Estado sugerido al empezar: **Lista para probar** (o el que muestre la pantalla).
4. Abre **Configurar perfiles y descuentos** (segundo paso).
5. Carga lo del taller:
   - Perfiles (marco/riel, hoja, encuentro, junquillo, zócalo, etc.)
   - Descuentos en mm (si los conocen)
   - Accesorios referenciales si aplica
6. Si pueden, usa el **ejemplo real** (un vano que ya fabricaron) y ajusta hasta que la pauta se parezca a lo que cortan en el taller.
7. Cuando confíen en el cálculo, pasa el estado a **Validada**.
8. Activa la **pauta** si aparece el interruptor, y **guarda**.

**Estados (en simple):**

- **Sin configurar / Lista para probar / En calibración** → se puede usar, pero con cuidado (revisar).
- **Validada** → el taller confía en esa estimación.
- **Revisar cambios** → algo cambió; conviene volver a chequear.

---

## 5. Cómo se usa al cotizar

1. Ve a **Cotizaciones → Nueva** (mejor en computador / desktop).
2. Elige el tipo de pieza y la **línea** del catálogo.
3. Pon **medidas**.
4. Si esa línea tiene estimación activa, aparece el panel **Cubicación y pauta**.
5. Revisa la tabla (perfil, función, medida, cantidad, total lineal, vidrio, etc.).
6. Si hace falta, ajusta **solo esa cotización**.
7. Si el ajuste debe quedar para siempre en esa línea, usa la opción de **guardar ajuste para la línea** (con confirmación).

Importante: al guardar la pieza, Ventora **congela** la pauta de esa cotización. Si mañana cambias la línea, las cotizaciones viejas **no se reescriben**.

---

## 6. Consejos prácticos del taller

1. Empieza con **2 o 3 líneas** que usen todos los días; no cargues todo el catálogo de una.
2. Primero deja bien el **precio**; después calibra materiales.
3. Usa un **vanó real** ya fabricado para calibrar descuentos.
4. Si el trabajo es bow, módulos raros o muy personalizado → **constructor**, no fuerzas una partida.
5. La pauta es una **ayuda revisable**, no un plano de máquina ni promesa de cero desperdicio.

---

## 7. Checklist rápido (para imprimir)

- [ ] Creé la línea con nombre y precio  
- [ ] La dejé activa y guardé  
- [ ] (Opcional) Activé estimación V1  
- [ ] Elegí una de las 3 partidas  
- [ ] Cargué perfiles / descuentos del taller  
- [ ] Probé con un ejemplo real  
- [ ] Pasé a **Validada** cuando confié  
- [ ] Cotizé una pieza de prueba y revisé la pauta  

---

## 8. Si algo no cuadra

| Problema | Qué hacer |
|---|---|
| No aparece la pauta al cotizar | Revisar: línea activa + estimación activada + partida elegida + medidas ingresadas |
| Los mm no calzan con el taller | Ajustar descuentos / ejemplo real; no “inventar” otra partida |
| Tipología rara | Armar en constructor; pauta manual si hace falta |
| Cotización vieja no cambió | Es normal: quedó congelada a propósito |

Si necesitan ayuda, anoten: **nombre de la línea**, **partida elegida** y **qué medida no calza** (ej. “hoja horizontal me da 594 y en taller corto 590”).
