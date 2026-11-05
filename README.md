# Bolsillo

App web de gastos personales: cargás un gasto en segundos y ves cuánto llevás gastado en el mes, contra tu presupuesto y contra el mes anterior.

> Proyecto conceptual — diseño y desarrollo: Mateo Alzari

## Qué hace

- **Cargar, editar y borrar gastos**: monto, categoría, fecha (hoy por defecto), descripción opcional y medio de pago. Para borrar se pide confirmación dentro de la propia app.
- **Resumen del mes**: total gastado, presupuesto editable con barra de progreso, aviso al pasar el 80% y el 100%, y comparación con el mes anterior. En el mes en curso se compara "a esta altura", o sea, hasta el mismo día del mes anterior.
- **Gráficos**: gasto por categoría (barras horizontales; tocá una para filtrar la lista) y gasto por día.
- **Lista** ordenada por fecha y agrupada por día, con búsqueda por descripción (ignora mayúsculas y tildes) y filtro por categoría.
- **Datos de ejemplo** la primera vez (mes anterior completo + mes actual hasta hoy) y un botón para borrarlos y empezar de cero.
- **Exportar a CSV** los gastos del mes, separado por `;` para que Excel lo abra bien en español.
- **Modo claro y oscuro**: sigue al sistema y se puede cambiar con un botón.

Todo se guarda en `localStorage`. No hay backend.

## Stack

React 18 + Vite + TypeScript · Recharts (gráfico por día) · lucide-react (íconos) · Vitest.

## Estructura

```
src/
  lib/            lógica pura, sin React (con tests)
    stats.ts      totales, por categoría, por día, presupuesto, comparación, filtros
    money.ts      formato $ 12.500 y lectura de montos
    dates.ts      meses y días en español
    csv.ts        exportación
    seed.ts       datos de ejemplo
    storage.ts    lectura/escritura en localStorage
  components/     piezas de la interfaz
  hooks/useTheme  modo claro/oscuro
scripts/contrast.mjs   verifica el contraste WCAG de la paleta
docs/                  propuestas de estilo iniciales
```

## Comandos

```bash
npm install
npm run dev        # desarrollo
npm test           # tests de la lógica
npm run contrast   # chequeo de contraste de colores
npm run build      # build de producción en dist/
npm run preview    # sirve el build en http://localhost:4180
```

## Accesibilidad

- Textos chicos con contraste ≥ 4,5:1 y gráficos ≥ 3:1, en los dos modos (`npm run contrast`).
- Todo se puede usar con teclado; los diálogos atrapan el foco y se cierran con Escape.
- Labels en todos los campos, errores asociados con `aria-describedby` y avisos con `aria-live`.
- Respeta `prefers-reduced-motion`.
