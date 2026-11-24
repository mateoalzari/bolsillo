---
name: "freelance-web-dev"
description: "Use for any freelance web project (Workana, Upwork, clients): landing pages, WordPress/Elementor/WooCommerce, Shopify, React/Next.js apps, AI chatbots or n8n automations, proposals and quotes from a job post."
---

# Desarrollo web freelance

Trabajo con un freelancer que vende proyectos web en Workana y plataformas similares. El objetivo de cada proyecto: **un cliente satisfecho que deja 5 estrellas y vuelve**. Eso significa entregar rápido, con calidad profesional, y que el cliente pueda usar y editar lo que recibe sin depender de nosotros (salvo que pague mantenimiento).

Respondo en español salvo que el cliente o el anuncio estén en otro idioma; los textos para el cliente van en su idioma.

## 1. Primero: entender el pedido

Cuando el usuario pega un anuncio de Workana o describe un cliente, antes de programar extraigo:
- Tipo de proyecto (landing, web corporativa, e-commerce, app, automatización)
- Requisitos explícitos y **trampas ocultas** ("inicia tu propuesta con la frase X", multilingüe, autogestionable, SEO, plazos)
- Qué tiene que poder hacer el cliente solo después de la entrega
- Riesgos: alcance ambiguo, "hacer como Amazon" con presupuesto bajo, credenciales que faltan

Si falta algo que cambia el stack o el precio, lo pregunto. Si no, avanzo con lo más razonable y lo digo.

## 2. Elegir el stack (regla de oro: lo que el cliente pueda mantener)

| Pedido del cliente | Stack por defecto |
|---|---|
| "Quiero editar yo mismo los textos", web corporativa, blog, agencia | **WordPress** + tema ligero (Hello / GeneratePress / Astra) + Elementor si lo piden, o Gutenberg con bloques nativos |
| Tienda online pequeña/mediana, LatAm | **WooCommerce** (integra Mercado Pago, pagos locales) |
| Tienda con foco en vender rápido, sin servidor | **Shopify** (tema Dawn u otro OS 2.0, secciones Liquid personalizadas) |
| Landing de campaña, portfolio, sitio estático | **HTML + CSS + JS vanilla** o **Astro**, deploy en Hostinger / Netlify / Vercel |
| App web, dashboard, SaaS, sistema interno, login | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**, base de datos **Supabase** (Postgres + auth) |
| API / backend separado | **Node + Express/Hono** o **FastAPI** (Python) si hay IA o datos |
| Chatbot, IA en una web, procesar documentos | API de Claude/OpenAI desde el backend (nunca la clave en el frontend) |
| Automatizar procesos (formularios → CRM → WhatsApp/email) | **n8n** (o Make/Zapier si el cliente ya lo usa) |

Si el anuncio nombra una tecnología, uso esa aunque no sea mi favorita. No propongo React a quien pidió WordPress.

## 3. Estándares de calidad (siempre, en cualquier stack)

**Responsive real**: mobile-first. Probar a 360px, 768px, 1280px y 1920px. Nada de scroll horizontal, botones táctiles de 44px mínimo.

**Rendimiento (Core Web Vitals)**:
- Imágenes en WebP/AVIF, con `width`/`height`, `loading="lazy"` salvo la principal (que va con `fetchpriority="high"`)
- Máximo 2 familias tipográficas, `font-display: swap`, precargar la principal
- Sin librerías pesadas para cosas que CSS resuelve (animaciones simples, sliders básicos)
- Objetivo: LCP < 2.5s, CLS < 0.1, Lighthouse ≥ 90 en móvil

**SEO técnico** (lo piden en casi todos los anuncios):
- Un solo `h1` por página, jerarquía de títulos correcta
- `title` (≤ 60 caracteres) y `meta description` (≤ 155) únicos por página
- Open Graph + Twitter cards, favicon, `lang` correcto
- Schema.org JSON-LD según el negocio (LocalBusiness, Organization, Product, Article, FAQPage)
- `sitemap.xml`, `robots.txt`, URLs limpias, `alt` descriptivo en imágenes
- En WordPress: Rank Math o Yoast configurado

**Accesibilidad (WCAG 2.1 AA)**: contraste 4.5:1 en texto, foco visible, navegación con teclado, `label` en todos los inputs, HTML semántico (`header`, `nav`, `main`, `footer`), `aria-label` en botones de solo ícono.

**Conversión** (es lo que el cliente realmente quiere):
- CTA principal visible sin hacer scroll, repetido al final
- Botón de WhatsApp flotante en negocios LatAm/España (enlace `wa.me` con mensaje predefinido)
- Formulario de contacto que funcione de verdad y muestre estados (enviando, éxito, error)
- Prueba social: testimonios reales del cliente, logos, números

**Seguridad**: claves y tokens en variables de entorno, nunca en el código del navegador. Validar datos en el servidor. Formularios con protección anti-spam (honeypot o Turnstile/reCAPTCHA). En WordPress: pocos plugins, todos actualizados.

**Analítica**: dejar preparado Google Analytics 4 / Tag Manager y Search Console si el cliente lo pide o tiene sentido.

## 4. Diseño: que no parezca hecho por IA

Usar el skill `frontend-design` para la dirección visual. Además, evitar los clichés de IA:
- Nada de degradados violeta-azul genéricos, ni emojis como íconos, ni "Bienvenido a nuestra web"
- Tipografía con carácter (pareja display + texto), paleta basada en la marca del cliente
- Textos concretos del negocio, no relleno. Si faltan textos reales, escribir copy creíble y marcar con `[CONFIRMAR]` lo que el cliente debe validar
- Imágenes: placeholders con dimensiones correctas y nota de qué foto va ahí; nunca inventar fotos de "equipo" o testimonios presentados como reales

Antes de entregar algo visual, revisarlo renderizado (con `ui-design-review` si está disponible) en móvil y escritorio.

## 5. Notas por stack

**WordPress / Elementor**
- Personalizaciones en un **tema hijo** o plugin propio, nunca editando el tema padre
- CSS propio en el tema hijo o en Elementor → Site Settings → Custom CSS; colores y tipografías como Global Colors/Fonts para que el cliente los cambie
- Código PHP: prefijar funciones, escapar salida (`esc_html`, `esc_url`), sanitizar entrada, usar hooks
- Multilingüe: Polylang (gratis) o WPML
- Entregar: credenciales, video o guía corta de cómo editar contenido

**Shopify**: secciones y bloques editables desde el personalizador (schema en Liquid), no texto fijo en el código.

**Next.js**: TypeScript estricto, Server Components por defecto, `next/image` y `next/font`, metadata API para SEO, validación con Zod, variables en `.env.local` + `.env.example`. Estructura `app/`, `components/`, `lib/`.

**Estático (HTML/CSS/JS)**: un archivo CSS con variables (`--color-primary`, etc.), JS sin dependencias salvo que haga falta, listo para subir por FTP o drag-and-drop a Hostinger. Para webs con mucho "efecto wow" usar el skill de webs premium para Hostinger si está disponible.

**IA / automatización**: explicar al cliente el costo mensual estimado de la API, poner límites de uso y manejo de errores, y documentar el flujo de n8n con notas en cada nodo.

## 6. Entrega profesional

Cada proyecto termina con:
1. El código o sitio funcionando, probado en Chrome, Safari y Edge
2. Un `README.md` (o guía en PDF/Doc para clientes no técnicos) con: cómo editar contenido, dónde están las credenciales, cómo desplegar, qué renovar (dominio, hosting, licencias)
3. Lista de lo que queda pendiente o necesita datos del cliente
4. Checklist de calidad de la sección 3 revisada

## 7. Propuestas y presupuestos para Workana

Cuando el usuario pegue un anuncio y pida una propuesta:
- Cumplir cualquier instrucción oculta del anuncio (frases clave, preguntas a responder)
- Primera línea: demostrar que leyó el proyecto (mencionar algo específico del negocio), no "Hola, soy experto con 10 años..."
- Explicar en 3–5 puntos cómo lo va a resolver y con qué tecnología, en lenguaje del cliente
- Plazo realista dividido en hitos (Workana paga por hitos)
- Una pregunta inteligente que muestre criterio
- Corta: el cliente lee 50 propuestas. Máximo ~200 palabras
- Presupuesto: desglosar por hitos; sugerir al usuario un rango según complejidad, y advertir si el presupuesto del cliente es irreal para el alcance
- No inventar experiencia, portfolio ni reseñas que el usuario no tiene