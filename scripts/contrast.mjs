// Verifica el contraste (WCAG 2.1) de los pares de colores del tema.
// Uso: node scripts/contrast.mjs
const lum = (hex) => {
  const [r, g, b] = hex.replace('#', '').match(/../g).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const T = {
  light: {
    bg: '#FAF7F2', surface: '#FFFFFF', surface2: '#F4EFE7', text: '#1E1A16', muted: '#655C52',
    primary: '#5B3FD9', onPrimary: '#FFFFFF', link: '#5134CF',
    heroBg: '#F3EADB', heroText: '#2A2116', heroMuted: '#5A4C3A', heroFill: '#2A2116',
    warn: '#8A4B00', danger: '#B42318', bar: '#8A7D6E',
    cats: ['#C47552', '#4F8D5C', '#4A78B5', '#A8852F', '#B6566B', '#7462C0', '#3C8989', '#857D72'],
  },
  dark: {
    bg: '#14121A', surface: '#1C1924', surface2: '#25212F', text: '#F1EEF7', muted: '#A9A2B6',
    primary: '#9C86FF', onPrimary: '#160E33', link: '#A996FF',
    heroBg: '#262036', heroText: '#F5EBD8', heroMuted: '#CEC3AF', heroFill: '#F5EBD8',
    warn: '#F2B857', danger: '#FF8F85', bar: '#8B829C',
    cats: ['#DE9875', '#7DB98A', '#7FA5DA', '#D2AF5E', '#D9849A', '#A596E4', '#6DBBBB', '#ABA397'],
  },
};

let fail = 0;
const check = (mode, name, fg, bg, min) => {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${mode.padEnd(5)} ${name.padEnd(34)} ${r.toFixed(2)}:1 (mín ${min})`);
};

for (const [mode, t] of Object.entries(T)) {
  for (const [bgName, bg] of [['bg', t.bg], ['surface', t.surface], ['surface2', t.surface2]]) {
    check(mode, `texto / ${bgName}`, t.text, bg, 4.5);
    check(mode, `texto secundario / ${bgName}`, t.muted, bg, 4.5);
    check(mode, `enlace / ${bgName}`, t.link, bg, 4.5);
    check(mode, `peligro / ${bgName}`, t.danger, bg, 4.5);
  }
  check(mode, 'texto botón principal', t.onPrimary, t.primary, 4.5);
  check(mode, 'total / tarjeta total', t.heroText, t.heroBg, 4.5);
  check(mode, 'texto chico / tarjeta total', t.heroMuted, t.heroBg, 4.5);
  check(mode, 'aviso 80% / tarjeta total', t.warn, t.heroBg, 4.5);
  check(mode, 'aviso 100% / tarjeta total', t.danger, t.heroBg, 4.5);
  check(mode, 'barra presupuesto / tarjeta (gráf.)', t.heroFill, t.heroBg, 3);
  check(mode, 'barras por día / superficie (gráf.)', t.bar, t.surface, 3);
  t.cats.forEach((c, i) => check(mode, `categoría ${i + 1} / superficie (gráf.)`, c, t.surface, 3));
}
console.log(fail ? `\n${fail} pares no cumplen.` : '\nTodos los pares cumplen.');
process.exit(fail ? 1 : 0);
