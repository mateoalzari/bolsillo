# Bolsillo — contexto para Claude Code

App web de finanzas personales para Argentina. Responde **cuánto te queda hasta fin de mes y cuánto ya tenés comprometido para el siguiente**: cuotas, gastos fijos, tarjetas con cierre y vencimiento, vista en dólares. Es un proyecto personal de Mateo (mateoalzari) armado como si fuera un trabajo de Workana; el brief original está resumido abajo.

Hablá con Mateo en español rioplatense (vos). Todo el texto de la interfaz va en español de Argentina.

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173 (necesita .env.local, ver .env.example; sin eso funciona solo la demo)
npm test         # Vitest: 40 tests de lógica, sincronización y monedas
npm run build    # tsc -b && vite build
```

Antes de dar algo por terminado: `npm test` y `npm run build` sin errores, y mirar el resultado en el navegador a 390 px y 1366 px, en claro y oscuro (sin scroll horizontal).

## Stack

React 19 + TypeScript estricto + Vite + React Router. Supabase (Postgres + Auth) con `@supabase/supabase-js`. Deploy en Vercel. Sin librerías de UI ni de gráficos: los gráficos son SVG propios. Tipografías auto-alojadas: Bricolage Grotesque (títulos y números) e Inter (texto).

## Ramas y deploy

- `fase-1-desde-cero`: **rama de producción** en Vercel → https://bolsillo-gamma.vercel.app. Cada push ahí publica en producción.
- `fase-2`: Fase 2 completa, todavía **sin publicar**. Vista previa: https://bolsillo-git-fase-2-alzarimateo-7233.vercel.app
- `main`: la versión vieja de Mateo, anterior a todo esto. No tocarla.
- Las ramas `fase-*` se crearon como ramas huérfanas: **no comparten historia con `main`**, así que no se pueden unir con un PR común a `main`.
- Para publicar la Fase 2 en producción: llevar `fase-2` a `fase-1-desde-cero` (por ejemplo `git push origin fase-2:fase-1-desde-cero`, que es fast-forward) **solo después de que Mateo confirme que probó la cuenta real**. Alternativa: cambiar la Production Branch en Vercel a `fase-2`.
- Vercel: proyecto `bolsillo` en el equipo `alzarimateo-7233`. No hay variables de entorno cargadas: las públicas de Supabase van en `.env.production` (ver abajo).

## Estructura

```
src/
  lib/          lógica pura y testeada (sin React)
    dates.ts      fechas locales YYYY-MM-DD, meses YYYY-MM
    ledger.ts     cuotas: una compra se guarda UNA vez y las cuotas se calculan al leer
    cards.ts      tarjeta: cierre y vencimiento → fecha del primer pago
    recurring.ts  gastos/ingresos fijos idempotentes (clave regla@mes, skippedMonths)
    stats.ts      balance, comparación "a la misma altura", presupuesto, comprometido, series
    insights.ts   lecturas automáticas (reglas simples, sin IA)
    currency.ts   monedas, formato es-AR, conversión vía ARS
    rates.ts      cotizaciones de dolarapi.com (/cotizaciones y /dolares/blue) con caché
    cloud.ts      filas de Supabase ⇄ objetos, diff por id, carga y escritura
    storage.ts    localStorage (modo demo)
    sample.ts     datos de ejemplo deterministas (7 meses)
    csv.ts        exportación para Excel en español (; y coma decimal, BOM, anti-fórmulas)
  state/
    AuthState.tsx   sesión: loading | anon | demo | cloud; errores de Auth en español
    AppState.tsx    reducer + origen de datos: demo (localStorage) | cloud (Supabase) | preview (portada)
    useMonthData.ts cálculos memorizados del mes elegido
  components/   AppShell (barra, navegación, botón agregar), formularios, resumen, lista, gráficos
  pages/        Landing, AuthPages (ingresar/registrarse/recuperar/nueva-clave), Month, Charts, Fixed
  styles/       tokens.css (paleta Crema, claro/oscuro), app.css, landing.css
supabase/migrations/0001_init.sql   esquema + RLS + trigger de perfil (ya aplicado)
```

Rutas: `/` portada · `/ingresar` · `/registrarse` · `/recuperar` · `/nueva-clave` · `/app` (mes) · `/app/graficos` · `/app/fijos`. `/app` exige sesión o modo demo.

## Decisiones que no hay que romper

- **Cuotas:** nunca guardar una fila por cuota. La compra guarda total, cantidad de cuotas, fecha y (si es con tarjeta) `paymentStart`. Las cuotas salen de `entriesForMovement`. El reparto es en centavos exactos (el resto va en la primera).
- **Tarjetas:** compra hasta el día de cierre → resumen de ese mes; después → el siguiente. Se paga en el vencimiento. `paymentStart` se calcula **al guardar**: cambiar el cierre de una tarjeta no mueve compras viejas. Crédito sin tarjeta = mes de compra.
- **Balance = lo que se paga en el mes** (criterio de caja). Las compras del mes con tarjeta que se pagan después se listan aparte ("Con tarjeta: se pagan más adelante") y cuentan en lo comprometido del mes siguiente.
- **Fijos:** `materializeRecurring` es idempotente (un movimiento por regla y mes). Borrar el movimiento de un mes lo agrega a `skippedMonths`. Editar una regla aplica desde el mes actual.
- **Reducer inmutable:** un elemento que no cambió conserva la misma referencia. `diffById` en `cloud.ts` depende de eso para saber qué mandar a Supabase. No mutar objetos del estado.
- **Sincronización:** la app trabaja en memoria; en modo cloud, cada cambio se manda a Supabase por diferencias, en orden, con reintento ("Sin guardar · Reintentar") y aviso al cerrar la pestaña con cambios pendientes.
- **Moneda principal** por usuario (ARS, USD, EUR, BRL, CLP, UYU), guardada en `profiles.currency`. Todos los montos se cargan en esa moneda; cambiarla no convierte montos. La vista convertida es solo visual.
- **Estilo:** Crema (fondo crema, violeta como acción). El estilo "Contraste" se descartó en el hito 1.
- Fechas siempre como strings locales `YYYY-MM-DD`; no usar `toISOString()` para fechas (corre por zona horaria).

## Supabase

- Proyecto `fwcyqwrlwrwwrhacakbd` ("Bolsillo"), región us-west-2.
- Tablas `profiles`, `cards`, `recurring_rules`, `movements`, todas con RLS: cada usuario ve y modifica solo sus filas (`user_id = auth.uid()`); `anon` sin permisos. PK `(user_id, id)`; los ids los genera la app (texto).
- Trigger `on_auth_user_created` crea el perfil.
- Auth: email + contraseña activo; Site URL y redirecciones configuradas para producción, previews de Vercel (`https://bolsillo-*-alzarimateo-7233.vercel.app/**`) y `http://localhost:5173/**`. Flujo `implicit` para que los links de mail funcionen en otro dispositivo.
- `.env.production` (commiteado) tiene la URL y la **publishable key**: son públicas por diseño. **Nunca** poner la secret key en el repo, en `.env*` del front ni en el navegador.
- Cambios de esquema: nueva migración numerada en `supabase/migrations/`, idempotente, con RLS desde el principio.

## Estado y próximos pasos

Hecho: Fase 1 completa (en producción) + tarjetas con cierre + Fase 2 completa en `fase-2` (portada, cuentas, nube, moneda principal, SEO, imagen OG). Lighthouse móvil: portada 96 / app 98 de rendimiento; 100 en accesibilidad, buenas prácticas y SEO.

Pendiente, en orden:
1. **Verificar la cuenta real** en la vista previa de `fase-2`: registro con email, confirmación, carga de movimientos, recarga, otro dispositivo, recuperación de contraseña. No se pudo probar contra Supabase desde el entorno anterior. Si algo falla, revisar consola y red (`read_network_requests`) antes de cambiar código.
2. **Publicar Fase 2** en producción (ver "Ramas y deploy"), con confirmación de Mateo.
3. **Google OAuth:** crear credenciales en Google Cloud (Mateo, con su cuenta) y cargarlas en Supabase → Authentication → Providers → Google. El botón ya existe y muestra un aviso mientras tanto.
4. **SMTP propio** (por ejemplo Resend) en Supabase → Authentication → Emails, por el límite bajo de mails del servicio por defecto. Opcional: plantillas de mail en español.
5. **Fase 3** del brief: ver abajo.
6. Probar en Safari de iPhone y Edge reales (Mateo no tiene iPhone; pendiente sin fecha).

## Brief original (resumen)

Anuncio armado por Mateo como si fuera de Workana. Stack pedido: React + Vite + TypeScript, Supabase, Vercel.

- **Fase 1 (hecha):** movimientos, balance y comparación con el mes anterior a la misma altura, presupuesto con avisos 80/100 %, cuotas 1–24 y comprometido del mes siguiente, fijos automáticos y vencimientos a 30 días, gráficos (6 meses, categoría, día), lecturas automáticas, dólar oficial/blue, búsqueda y filtros, CSV, datos de ejemplo, mobile-first, claro/oscuro, 2 propuestas de estilo.
- **Fase 2 (hecha, sin publicar):** portada con mockup animado hecho con los componentes reales, 4 funciones con ilustraciones animadas, cómo funciona en 3 pasos, CTA; registro/ingreso con email y Google, recuperación, cuenta demo; datos en Supabase con RLS; moneda principal por usuario.
- **Fase 3 (pendiente):** IA para cargar gastos desde foto de ticket y en lenguaje natural, importación de resumen de tarjeta (PDF/CSV), Google Calendar para vencimientos. Siempre vía funciones de servidor de Vercel (`/api`), **nunca** claves de IA en el navegador; límite de uso por usuario. **Gmail** queda como opcional: leer mails exige verificación de Google con auditoría de seguridad paga y lenta; priorizar la importación de PDF/CSV.
- Requisitos transversales: Lighthouse móvil ≥ 90, tests de la lógica, README, accesibilidad WCAG AA.

## Skills del proyecto

En `.claude/skills/` hay cuatro skills que Mateo armó para su trabajo freelance; usalos:
- `freelance-web-dev`: forma de trabajo, elección de stack, checklist de calidad, entregas y propuestas de Workana.
- `design-craft-floor`: piso de calidad visual y anti "diseño de IA" (adaptado de Impeccable, Apache 2.0).
- `web-interface-guidelines`: reglas de interfaz de Vercel (MIT) para revisar código de UI.
- `web-quality-audit`: auditoría de rendimiento, accesibilidad, SEO y seguridad antes de entregar (Addy Osmani, MIT).

Además conviene instalar el plugin oficial `frontend-design` de Anthropic para la dirección visual.

## Forma de trabajo con Mateo

- Va aprendiendo: explicá en términos simples qué hiciste y por qué, sin jerga innecesaria.
- Confirmar antes de: publicar en producción, borrar cosas en Vercel/Supabase/GitHub, cambiar configuración de cuentas. Los `drop … if exists` de migraciones idempotentes en proyectos nuevos están bien, pero avisá.
- Contraseñas y claves secretas las escribe él, nunca vos.
- Trabajar en ramas; no reescribir `main`.
