# Bolsillo

App web de finanzas personales pensada para Argentina: responde **cuánto te queda hasta fin de mes y cuánto ya tenés comprometido para el que viene**, con cuotas, gastos fijos, vencimientos y vista en dólares.

Esta rama contiene la **Fase 1 (núcleo de la app)**, hecha desde cero. Todo funciona en el navegador con datos de ejemplo; las cuentas y los datos en la nube llegan en la Fase 2.

## Qué incluye

| Función | Dónde |
|---|---|
| Movimientos (gasto/ingreso, monto, categoría, fecha, descripción, medio de pago), editar y borrar con confirmación | Botón **Agregar movimiento** y tocando cualquier fila |
| Balance del mes como frase ("Te quedan $ X hasta fin de mes") y comparación con el mes anterior **a la misma altura** | Pestaña **Mes** |
| Presupuesto mensual editable, con barra y avisos al 80% y al 100% | Pestaña **Mes** |
| Compras de 1 a 24 cuotas con crédito ("Cuota 2/6") y total comprometido para el mes siguiente | Formulario + **Fijos y cuotas** |
| Gastos e ingresos fijos que se generan solos cada mes, y próximos vencimientos a 30 días | **Fijos y cuotas** + "Lo que viene" |
| Gráficos: últimos 6 meses, gasto por categoría y por día | **Gráficos** (en escritorio, al costado de la lista) |
| Lecturas automáticas (2–3 frases calculadas con los datos) | "Lecturas del mes" |
| Vista en dólares oficial y blue con [dolarapi.com](https://dolarapi.com); si la API falla, usa la última cotización guardada o sigue en pesos | Selector de moneda arriba |
| Búsqueda, filtro por categoría, selector de mes y exportación a CSV (con `;` y coma decimal, para Excel en español) | Lista de movimientos |
| Datos de ejemplo realistas (7 meses) | Se cargan solos la primera vez; se pueden restaurar o borrar en **Ajustes** |
| Dos propuestas de estilo (**Crema** y **Contraste**) con modo claro/oscuro | **Ajustes** (ícono de controles, arriba a la derecha) |

## Cómo correrla

Requiere Node 20 o más nuevo.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests de la lógica (Vitest)
npm run build    # build de producción en dist/
```

## Publicar en Vercel

1. En [vercel.com/new](https://vercel.com/new), importar este repositorio y elegir la rama.
2. Vercel detecta Vite solo (build `npm run build`, salida `dist`). No hace falta configurar variables en esta fase.
3. `vercel.json` ya redirige todas las rutas a `index.html` para que funcione React Router.

## Cómo está resuelto

**Cuotas.** Una compra en cuotas se guarda **una sola vez** (total + cantidad de cuotas + fecha). Las cuotas de cada mes se calculan al leer (`src/lib/ledger.ts`). Así, editar o borrar la compra actualiza todas sus cuotas y nunca quedan cuotas huérfanas. El total se reparte en centavos exactos (los centavos que sobran van en la primera cuota). Hoy la cuota 1 cae en el mes de la compra; si se decide usar la fecha de cierre de la tarjeta, se cambia en un solo lugar.

**Gastos fijos.** Son reglas (`RecurringRule`) que generan un movimiento por mes con una clave única regla+mes (`src/lib/recurring.ts`). La generación es idempotente: se puede correr cada vez que se abre la app sin duplicar. Si el usuario borra el movimiento de un mes, ese mes queda marcado y no se vuelve a crear. Editar un fijo aplica desde el mes actual; los meses anteriores no cambian.

**Datos.** `src/lib/storage.ts` define una interfaz `DataStore`. En la Fase 1 la implementa `localStorage`; en la Fase 2 se suma una implementación con Supabase y la demo sigue usando la local.

**Lecturas automáticas.** Reglas simples y explicables en `src/lib/insights.ts` (categoría por encima de su promedio de 3 meses, proyección del mes contra el presupuesto, cuotas del mes siguiente). No hay IA en esta fase.

## Estructura

```
src/
  lib/          lógica pura y testeada: fechas, montos, cuotas, fijos, estadísticas, lecturas, CSV, dólar
  state/        estado de la app (React context) y cálculos memorizados del mes
  components/   piezas de interfaz (lista, formulario, resumen, gráficos SVG propios)
  pages/        Mes, Gráficos, Fijos y cuotas
  styles/       tokens de diseño (2 estilos × claro/oscuro) y estilos
```

Sin librerías de gráficos ni de UI: los gráficos son SVG propios (JS total ≈ 100 kB gzip). Tipografías Bricolage Grotesque e Inter auto-alojadas.

## Calidad verificada

- 21 tests de lógica (cuotas, fijos, balance, comparación, presupuesto, lecturas, CSV, datos de ejemplo).
- Lighthouse en celular: Rendimiento 95, Accesibilidad 100, Buenas prácticas 100, SEO 100.
- Sin scroll horizontal a 390 px; probada en 390 px y 1366 px, claro y oscuro, ambos estilos.
- Formularios con labels, errores junto al campo y foco en el primer error; diálogos nativos (`<dialog>`) con foco y Escape; animaciones solo con `transform`/`opacity`/`filter` y respetando "reducir movimiento".
- Estados de carga, vacío y error: lista vacía, búsqueda sin resultados, cotización cargando / no disponible.

## Pendiente para el cliente

- Confirmar si la primera cuota cae en el mes de compra o en el siguiente resumen según el cierre de la tarjeta.
- Elegir entre los estilos **Crema** y **Contraste** (o una mezcla) para el resto del proyecto.
- Probar en Safari de iPhone y en Edge reales antes de cerrar el hito.
