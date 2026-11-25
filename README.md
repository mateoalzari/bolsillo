# Bolsillo

App web de finanzas personales pensada para Argentina: responde **cuánto te queda hasta fin de mes y cuánto ya tenés comprometido para el que viene**, con cuotas, gastos fijos, vencimientos y vista en dólares.

Incluye la **Fase 1** (núcleo de la app), la **Fase 2** (página de inicio, cuentas y datos en la nube) y, en la rama `fase-3`, la primera parte de la **Fase 3**: importar el resumen de la tarjeta.

## Fase 3 (parte 1): importar el resumen de la tarjeta

En **Mes → Importar** o **Fijos y cuotas → Importar resumen** (`/app/importar`):

1. Elegís el resumen en **PDF** (el original del banco, con texto) o en **CSV** exportado del home banking. Si el PDF tiene contraseña, la pide.
2. Bolsillo encuentra cada consumo: fecha, descripción, monto, cuotas (`C.03/06`, `Cuota 3 de 6`, `CTA 3/6`), consumos en dólares, impuestos y devoluciones. Los pagos de la tarjeta y los saldos no se importan. También lee el cierre, el vencimiento y la marca (Visa, Mastercard, Amex).
3. En la pantalla de revisión elegís qué filas importar, con qué **tarjeta** y en qué **categoría** (sugerida por el comercio o por cómo categorizaste antes uno parecido). Lo que ya está cargado aparece marcado y sin elegir, para no duplicarlo.
4. Al importar, cada compra en cuotas se guarda **una sola vez** (como si la cargaras a mano), ubicada para que la cuota del resumen caiga en su vencimiento. Se puede deshacer.

El archivo se lee **en el navegador**: no se sube a ningún servidor y no hay IA de por medio. El lector de PDF (pdf.js) se descarga solo cuando elegís un PDF.

Código: `src/lib/statement.ts` (lector), `src/lib/pdfText.ts` (texto del PDF), `src/lib/statementFile.ts` (tipo de archivo y codificación), `src/lib/importPlan.ts` (categorías, duplicados y armado de la compra), `src/pages/ImportPage.tsx` (pantalla). Los tests usan resúmenes **inventados** que imitan los de Visa y Mastercard (`src/lib/fixtures/statements.ts`), incluido un PDF real que se genera en el test.

## Fase 2: producto completo

| Función | Dónde |
|---|---|
| Página de inicio con un celular que muestra la app real (una compra en cuotas que actualiza lo comprometido), 4 funciones con ilustraciones animadas, "Cómo funciona" y llamado a la acción | `/` (`src/pages/Landing.tsx`) |
| Ingreso y registro con email y contraseña, recuperación de contraseña, botón de Google y **"Entrar con la cuenta demo"** | `/ingresar`, `/registrarse`, `/recuperar`, `/nueva-clave` |
| Datos de cada usuario en Supabase (Postgres) con Row Level Security; la demo sigue en el navegador | `src/lib/cloud.ts`, `supabase/migrations/0001_init.sql` |
| Moneda principal por usuario (ARS, USD, EUR, BRL, CLP, UYU) y vista convertida con cotizaciones de dolarapi.com | **Ajustes** + selector de moneda |
| Rutas protegidas: sin sesión ni demo, `/app` lleva a ingresar | `src/main.tsx` |
| Pasar los datos de la demo a la cuenta nueva | **Ajustes** → Datos |
| SEO de la portada: título, descripción, imagen para compartir (`public/og.png`), favicon | `index.html` |

### Cómo se guardan los datos

La app trabaja siempre sobre su estado en memoria (rápida y sin esperas). En modo cuenta, después de cada cambio calcula **qué cambió** contra lo último guardado (altas, cambios y bajas por id) y lo manda a Supabase en orden, agrupando cambios seguidos. Si falla la conexión, arriba aparece "Sin guardar · Reintentar" y no se pierde nada: el próximo intento manda todo lo pendiente. Si cerrás la pestaña con cambios sin guardar, el navegador avisa.

### Supabase

- Proyecto: `fwcyqwrlwrwwrhacakbd`. La migración está en `supabase/migrations/0001_init.sql` (ya aplicada).
- Cada tabla tiene `user_id` y una política RLS que solo deja leer y escribir las filas propias. Los anónimos no tienen acceso.
- Al registrarse, un trigger crea el perfil (moneda principal y presupuesto).
- Auth → URL Configuration: Site URL `https://bolsillo-gamma.vercel.app`; redirecciones permitidas para producción, vistas previas de Vercel y `localhost:5173`.
- `.env.production` tiene la URL y la **publishable key**, que son públicas por diseño. La secret key no está en el repo ni en el navegador.

### Pendiente de configurar

- **Ingreso con Google:** crear credenciales OAuth en Google Cloud y cargarlas en Supabase → Authentication → Providers → Google. El botón ya está; hasta entonces muestra un aviso.
- **Mails propios:** Supabase manda los mails de confirmación con un límite bajo por hora. Para producción conviene configurar un SMTP propio (por ejemplo Resend) en Authentication → Emails.

## Qué incluye

| Función | Dónde |
|---|---|
| Movimientos (gasto/ingreso, monto, categoría, fecha, descripción, medio de pago), editar y borrar con confirmación | Botón **Agregar movimiento** y tocando cualquier fila |
| Balance del mes como frase ("Te quedan $ X hasta fin de mes") y comparación con el mes anterior **a la misma altura** | Pestaña **Mes** |
| Presupuesto mensual editable, con barra y avisos al 80% y al 100% | Pestaña **Mes** |
| Compras de 1 a 24 cuotas con crédito ("Cuota 2/6") y total comprometido para el mes siguiente | Formulario + **Fijos y cuotas** |
| Tarjetas con día de cierre y vencimiento: cada compra cae en el mes en que se paga el resumen; las compras del mes que se pagan después se muestran aparte | **Ajustes** → Tarjetas, formulario y lista del mes |
| Gastos e ingresos fijos que se generan solos cada mes, y próximos vencimientos a 30 días | **Fijos y cuotas** + "Lo que viene" |
| Gráficos: últimos 6 meses, gasto por categoría y por día | **Gráficos** (en escritorio, al costado de la lista) |
| Lecturas automáticas (2–3 frases calculadas con los datos) | "Lecturas del mes" |
| Vista en dólares oficial y blue con [dolarapi.com](https://dolarapi.com); si la API falla, usa la última cotización guardada o sigue en pesos | Selector de moneda arriba |
| Búsqueda, filtro por categoría, selector de mes y exportación a CSV (con `;` y coma decimal, para Excel en español) | Lista de movimientos |
| Datos de ejemplo realistas (7 meses) | Se cargan solos la primera vez; se pueden restaurar o borrar en **Ajustes** |
| Estilo **Crema** (elegido en el hito 1) con modo claro/oscuro | **Ajustes** (ícono de controles, arriba a la derecha) |

## Cómo correrla

Requiere Node 20 o más nuevo. Copiá `.env.example` como `.env.local` con los datos de Supabase (sin eso, la app funciona solo en modo demo).

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests de la lógica (Vitest)
npm run build    # build de producción en dist/
```

## Publicar en Vercel

El proyecto ya está conectado: cada push a `fase-1-desde-cero` publica en producción (bolsillo-gamma.vercel.app), y las demás ramas generan una vista previa.

Para un proyecto nuevo:

1. En [vercel.com/new](https://vercel.com/new), importar este repositorio y elegir la rama.
2. Vercel detecta Vite solo (build `npm run build`, salida `dist`). No hace falta configurar variables en esta fase.
3. `vercel.json` ya redirige todas las rutas a `index.html` para que funcione React Router.

## Cómo está resuelto

**Cuotas.** Una compra en cuotas se guarda **una sola vez** (total + cantidad de cuotas + fecha). Las cuotas de cada mes se calculan al leer (`src/lib/ledger.ts`). Así, editar o borrar la compra actualiza todas sus cuotas y nunca quedan cuotas huérfanas. El total se reparte en centavos exactos (los centavos que sobran van en la primera cuota).

**Tarjetas y cierre.** Cada tarjeta tiene día de cierre y de vencimiento (`src/lib/cards.ts`). Una compra hasta el cierre entra en el resumen de ese mes; después del cierre, en el siguiente. La primera cuota se paga en el vencimiento de ese resumen, y esa fecha se guarda en la compra (`paymentStart`) al momento de cargarla: si después cambia el cierre de la tarjeta, las compras ya hechas no se mueven. Una compra con crédito sin tarjeta cargada cae en el mes de compra. El balance del mes cuenta lo que **se paga** ese mes; las compras del mes que se pagan después se listan aparte.

**Gastos fijos.** Son reglas (`RecurringRule`) que generan un movimiento por mes con una clave única regla+mes (`src/lib/recurring.ts`). La generación es idempotente: se puede correr cada vez que se abre la app sin duplicar. Si el usuario borra el movimiento de un mes, ese mes queda marcado y no se vuelve a crear. Editar un fijo aplica desde el mes actual; los meses anteriores no cambian.

**Datos.** `src/lib/storage.ts` define una interfaz `DataStore`. En la Fase 1 la implementa `localStorage`; en la Fase 2 se suma una implementación con Supabase y la demo sigue usando la local.

**Lecturas automáticas.** Reglas simples y explicables en `src/lib/insights.ts` (categoría por encima de su promedio de 3 meses, proyección del mes contra el presupuesto, cuotas del mes siguiente). No hay IA en esta fase.

## Estructura

```
src/
  lib/          lógica pura y testeada: fechas, montos, cuotas, fijos, estadísticas, lecturas, CSV, dólar
  state/        sesión, estado de la app (demo / nube / vista previa) y cálculos del mes
  components/   piezas de interfaz (lista, formulario, resumen, gráficos SVG propios)
  pages/        Portada, ingreso/registro, Mes, Gráficos, Fijos y cuotas, Importar resumen
supabase/       migraciones SQL
  styles/       tokens de diseño (2 estilos × claro/oscuro) y estilos
```

Sin librerías de gráficos ni de UI: los gráficos son SVG propios (JS total ≈ 100 kB gzip). Tipografías Bricolage Grotesque e Inter auto-alojadas.

## Calidad verificada

- 73 tests: lógica (cuotas, tarjetas y cierre, fijos, balance, comparación, presupuesto, lecturas, CSV, datos de ejemplo), conversión entre filas de la base y la app, diferencias para sincronizar, monedas y el lector de resúmenes de tarjeta (CSV y PDF).
- Lighthouse en celular: portada 96 de Rendimiento y app 98; Accesibilidad, Buenas prácticas y SEO 100.
- Sin scroll horizontal a 390 px; probada en 390 px y 1366 px, claro y oscuro.
- Formularios con labels, errores junto al campo y foco en el primer error; diálogos nativos (`<dialog>`) con foco y Escape; animaciones solo con `transform`/`opacity`/`filter` y respetando "reducir movimiento".
- Estados de carga, vacío y error: lista vacía, búsqueda sin resultados, cotización cargando / no disponible.

## Pendiente

- Probar en Safari de iPhone y en Edge reales (no verificado todavía).
