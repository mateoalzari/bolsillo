# Fase 3, parte 1: importar el resumen de la tarjeta — informe

Rama: **`fase-3`** (sale de `fase-2`). No toqué `fase-2` ni `fase-1-desde-cero` y no publiqué nada en producción.
Vista previa de Vercel (protegida, hay que tener la sesión de Vercel iniciada): https://bolsillo-git-fase-3-alzarimateo-7233.vercel.app

## Qué hice

**Una pantalla nueva: Importar resumen** (`/app/importar`). Se llega desde **Mes → Importar** (al lado de "Exportar CSV") y desde **Fijos y cuotas → Importar resumen**.

1. **Elegir el archivo.** Botón "Elegir el resumen" (en la compu también se puede arrastrar el archivo). Acepta **PDF** con texto y **CSV**. Si el PDF tiene contraseña, la pide (muchos bancos usan el DNI). Si el PDF es una foto o un escaneo, un Excel, un archivo vacío o de más de 10 MB, explica qué hacer.
2. **Lectura.** Por cada consumo detecta la fecha, la descripción, el monto y las cuotas (`C.03/06`, `Cuota 3 de 6`, `CUOTA 03/06`, `CTA 3/6`). También reconoce los consumos en dólares, los impuestos y cargos (sellos, IVA, percepciones, intereses), las devoluciones, el **cierre**, el **vencimiento** y la **marca** (Visa, Mastercard, Amex). Saltea los pagos de la tarjeta, los saldos, el pago mínimo y los totales.
3. **Revisión.** Arriba, la tarjeta (elegida sola por la marca del resumen) y la fecha de vencimiento, las dos editables. Debajo, una fila por consumo con:
   - casilla para elegir si se importa;
   - fecha, "cuota 3 de 12" y el total de la compra;
   - **categoría** sugerida (por cómo categorizaste antes ese comercio o por palabras clave: Coto → Supermercado, YPF → Transporte, Netflix → Servicios…);
   - **tarjeta** de esa fila.

   Lo que **ya está cargado** aparece sin elegir y con un aviso: «Parece que ya está cargado: "Coto" del 29 de octubre». Abajo queda una barra fija con la cantidad elegida, el total y el botón **Importar**.
4. **Listo.** Dice cuánto de lo importado se paga en ese vencimiento y cuánto queda en cuotas para los meses siguientes. Hay botones para ver el mes del vencimiento, importar otro resumen o **deshacer** la importación.

**Archivos nuevos**

| Archivo | Qué hace |
|---|---|
| `src/lib/statement.ts` | El lector: fechas, montos, cuotas, cierre/vencimiento, marca; CSV y texto de PDF |
| `src/lib/pdfText.ts` | Convierte el PDF en líneas de texto (con pdf.js); contraseña y escaneados |
| `src/lib/statementFile.ts` | Decide si es PDF, CSV o Excel; lee CSV en UTF-8 o Windows-1252 (Excel) |
| `src/lib/importPlan.ts` | Categoría sugerida, duplicados, tarjeta por marca y armado de la compra |
| `src/lib/pdfLoader.ts` | Carga pdf.js solo cuando se elige un PDF |
| `src/pages/ImportPage.tsx` | La pantalla |
| `src/components/ImportLink.tsx` | El botón de acceso |
| `src/lib/fixtures/statements.ts` | Resúmenes **inventados** para los tests y un generador de PDF |
| `src/lib/statement.test.ts` | 33 tests nuevos |

**Archivos que cambié**
- `AppState.tsx`: dos acciones nuevas, agregar varios movimientos juntos y sacarlos, para poder deshacer.
- `AppShell.tsx`: en la pantalla de importación se ocultan el selector de mes y el botón flotante, que tapaba la barra de confirmación.
- También tocaron cambios chicos `MovementList.tsx`, `FixedPage.tsx`, `Icon.tsx` (dos íconos nuevos), `app.css` y `main.tsx` (la ruta nueva).

**Dependencia nueva:** `pdfjs-dist` 6.4.299, versión fija. Es el lector de PDF de Mozilla.

## Cómo lo verifiqué

- **Tests:** `npm test` da 73, todos pasan (40 que ya estaban y 33 nuevos).
  - Cubren los dos resúmenes de ejemplo en PDF (Visa y Mastercard) y en CSV.
  - Uno de los tests arma un **PDF de verdad** y lo lee con pdf.js, así se prueba la extracción de punta a punta.
  - También cubren fechas en todos los formatos, montos con signo al final, cuotas válidas e inválidas, CSV con comillas y acentos de Excel, contraseña, escaneado, archivo que no es PDF, duplicados, categorías, tarjeta por marca, y que una cuota 3/12 caiga justo en el vencimiento.
- **Build:** `npm run build` sin errores, antes de cada commit.
- **Navegador, con la cuenta demo:** a 390 px y a 1366 px, en claro y en oscuro. Recorrí el flujo completo:
  - importar el PDF de Visa (9 de 11 elegidos), ver el resultado e ir al mes del vencimiento;
  - volver a importar el mismo PDF: los 9 aparecen como "ya cargado" y quedan sin elegir;
  - importar el CSV de Mastercard;
  - subir un archivo roto y ver el error.

  No hay scroll horizontal ni errores en consola. Con el teclado se llega al botón de elegir archivo.
- **Build de producción servido localmente:** el lector de PDF anda y **no se descarga hasta que elegís un PDF**.
- **Peso:** la portada y la app cargan lo mismo que antes. La pantalla de importación pesa 11 kB comprimida. pdf.js (129 kB comprimido, más su worker) se baja solo al elegir un PDF.

## Qué decidí (y por qué)

1. **Todo se lee en el navegador, sin IA ni servidor.** El resumen tiene datos sensibles, y así nunca sale del dispositivo. Con reglas alcanza para PDF con texto y CSV. El brief pide funciones de servidor solo para la IA, que queda para la parte 2 (foto de ticket y lenguaje natural).
2. **Una cuota se guarda como la compra completa, no como una fila suelta.** Respeta la regla del CLAUDE.md: una compra se guarda una vez y las cuotas se calculan.
   - Ejemplo: "Fravega C.03/12 $ 41.250" se guarda como una compra de $ 495.000 en 12 cuotas, con fecha de compra 5/9.
   - El primer pago queda ubicado de modo que **la cuota 3 caiga en el vencimiento de este resumen**. Las cuotas 4 a 12 aparecen solas en los meses siguientes, en "comprometido".
   - Consecuencia: si una compra en cuotas no estaba cargada, sus cuotas anteriores (1 y 2) aparecen en los meses pasados. Es correcto (las pagaste), pero cambia el balance de esos meses.
3. **Fecha de pago = vencimiento del resumen.** Todo lo importado se cuenta como pagado ese día, como el resto de la app (criterio de caja).
   - Si el archivo no trae vencimiento (pasa en muchos CSV), lo calculo con el cierre y el vencimiento de la tarjeta elegida, tomando como referencia la última compra del resumen.
   - Igual se puede cambiar a mano.
4. **Duplicados:** un gasto con la misma fecha de compra (±3 días) y el mismo monto. En cuotas, además, la misma cantidad de cuotas y el mismo valor de cuota. Así, cuando llega el resumen con la "C.04/06" de algo que importaste el mes pasado, lo reconoce. Los duplicados se muestran sin elegir, pero se pueden elegir igual.
5. **Qué se importa:**
   - **Pagos y saldos:** nunca, porque contarían doble.
   - **Impuestos, intereses y percepciones:** sí, en "Otros gastos". Son plata que sale.
   - **Devoluciones:** sin elegir por defecto. Si las elegís, entran como ingreso en el vencimiento, porque la app no tiene montos negativos.
6. **Consumos en dólares:** si tu moneda principal es el peso, no se pueden importar (se muestran grises con un aviso). Convertirlos con una cotización inventada daría un número que no es el que pagaste. Lo correcto es cargarlos a mano con lo que figura en pesos al pagar.
7. **Tarjeta:** se elige sola si el nombre de una de tus tarjetas incluye la marca del resumen ("Visa…"), o si tenés una sola. Si no tenés tarjetas, se puede importar igual, con aviso.
8. **Descripciones:** "SUPERMERCADO COTO" se muestra como "Supermercado Coto". Las siglas (YPF, DB.RG) quedan como están, y se sacan los números de comprobante y de cupón.
9. **Contraseña del PDF:** se usa solo para abrirlo y no se guarda.
10. **El punto 6 del pedido.** "Qué probé yo a la mañana" lo interpreté como **qué tenés que probar vos a la mañana**: es la sección que sigue. No inventé pruebas tuyas.

## Qué tenés que probar vos a la mañana

Lo más importante: **los resúmenes de ejemplo son inventados.** Imitan los formatos habituales de Visa y Mastercard de bancos argentinos, pero nunca vi uno real tuyo. Cada banco acomoda las columnas a su manera, así que la prueba con tus resúmenes reales es la que decide si esto sirve.

1. Abrí la vista previa de `fase-3` (link arriba). Si querés probar sin tocar tus datos reales, entrá con la **cuenta demo**.
2. Andá a **Mes → Importar** y subí el **PDF de tu último resumen de Visa**, el que descargás del home banking. Fijate:
   - que **estén todos los consumos** y no se cuele ningún pago ni saldo;
   - que los **montos** y las **cuotas** ("cuota 3 de 6") coincidan con el papel;
   - que el **vencimiento** y la **tarjeta** de arriba sean los correctos.
3. Repetí con el de **Mastercard**, y si tu banco lo permite, con el **CSV**.
4. Si el PDF pide contraseña, probá ponerla.
5. Importá y tocá **Ver el mes del vencimiento**: el total del mes tiene que sumar lo del resumen. En **Fijos y cuotas** tienen que aparecer las compras en cuotas con lo que falta pagar.
6. Volvé a importar el mismo archivo: todo tiene que aparecer como **ya cargado**.
7. Probá **Deshacer esta importación**.
8. Hacé lo mismo con tu **cuenta real** solo cuando la demo te convenza. Lo importado se guarda en Supabase y se puede deshacer o borrar a mano.

**Si algo no se lee bien, no hace falta que me mandes el resumen.** Copiá 3 o 4 líneas, cambiá comercios y montos, y pasámelas junto con lo que esperabas ver. Con eso agrego el formato y un test. Si un PDF no anda, abrí la consola (F12) y fijate si hay un error rojo.

Un detalle técnico para mirar en la vista previa: el lector de PDF usa un archivo `.mjs` (el worker). Localmente se sirve bien; en Vercel debería pasar lo mismo, pero si al elegir un PDF aparece "No pudimos cargar el lector de PDF", es por eso.

## Qué falta

- **Probar con resúmenes reales** (lo de arriba). Es posible que haya que ajustar el lector para tu banco.
- **Consumos en dólares** cuando la moneda principal es el peso: hoy se cargan a mano. Una mejora posible es importarlos convertidos con el dólar tarjeta del día del cierre, avisando que es aproximado.
- **Editar el monto o la descripción en la revisión** (hoy se elige fila, tarjeta y categoría; el resto se corrige después de importar).
- **Aviso al salir con la revisión a medio hacer.** Si cambiás de pantalla en la revisión, se pierde lo elegido, aunque no se guardó nada.
- **Lighthouse** de la pantalla nueva: no lo corrí. La portada y la app no cambiaron de peso.
- **Resto de la Fase 3:** carga con IA (foto de ticket y lenguaje natural, vía `/api` de Vercel con límite por usuario) y Google Calendar para vencimientos.
- **Publicar:** llevar `fase-3` a `fase-2` y después a producción, cuando lo apruebes.
- Del pendiente anterior: no supe si terminaste de configurar el **ingreso con Google**. Si ya está, falta probar el botón en producción.
