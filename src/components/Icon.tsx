/** Íconos dibujados a mano en una grilla de 24px, trazo 1.75 y puntas redondeadas. */
const paths = {
  plus: 'M12 5v14M5 12h14',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M6 9l6 6 6-6',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.6-4.6',
  download: 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4.5 7h15M10 11v6M14 11v6M6.5 7l.9 11.2A2 2 0 0 0 9.4 20h5.2a2 2 0 0 0 2-1.8L17.5 7M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7',
  repeat: 'M17 3.5l3 3-3 3M20 6.5H8.5A4.5 4.5 0 0 0 4 11v.5M7 20.5l-3-3 3-3M4 17.5h11.5A4.5 4.5 0 0 0 20 13v-.5',
  card: 'M3.5 7.5A2 2 0 0 1 5.5 5.5h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2zM3.5 10h17M7 15h4',
  calendar: 'M5.5 5.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2zM3.5 10h17M8 3.5v4M16 3.5v4',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
  month: 'M4 19.5V9M10 19.5V4.5M16 19.5v-7M20.5 19.5h-17',
  chart: 'M4 4.5v15h16M8 15l3.5-4 3 2.5L20 7',
  list: 'M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01',
  alert: 'M12 9v4.5M12 17h.01M10.3 4.3L2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  sparkle: 'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.5l5.1-1.9zM18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  arrowUp: 'M12 19V5m0 0l-6 6m6-6l6 6',
  arrowDown: 'M12 5v14m0 0l-6-6m6 6l6-6',
  pencil: 'M14.5 5.5l4 4M4.5 19.5l1-4.5L15.8 4.7a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5z',
  wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5V8M4 7.5v10A2.5 2.5 0 0 0 6.5 20h12a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 18.5 8h-12A2.5 2.5 0 0 1 4 7.5zM16 14h.01',
  cart: 'M3.5 4.5h2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.3h7.6a1.5 1.5 0 0 0 1.5-1.2L19.5 8H6.6M9.5 20h.01M16.5 20h.01',
  fork: 'M7 3.5v6.5a2.5 2.5 0 0 0 5 0V3.5M9.5 3.5v17M16.5 20.5v-17c-1.9.8-3 2.9-3 6v4h3',
  home: 'M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19z',
  bolt: 'M13 3.5L5.5 13.5h6l-1 7 7.5-10h-6z',
  bus: 'M6.5 4.5h11a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-10a2 2 0 0 1 2-2zM4.5 11.5h15M8 17.5v2M16 17.5v2M8 14.5h.01M16 14.5h.01',
  heart: 'M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z',
  ticket: 'M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1.5h16V16a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6.5H4zM14.5 6.5v11',
  bag: 'M5.5 8h13l-1 12h-11zM9 10.5V7a3 3 0 0 1 6 0v3.5',
  book: 'M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5zM5 18.5A1.5 1.5 0 0 0 6.5 20H19v-3',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  coins: 'M9 10.5c3 0 5.5-1.1 5.5-2.5S12 5.5 9 5.5 3.5 6.6 3.5 8 6 10.5 9 10.5zM3.5 8v4c0 1.4 2.5 2.5 5.5 2.5M3.5 12v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5M14.5 8v3M15 12.5c3 0 5.5-1.1 5.5-2.5M20.5 10v6c0 1.4-2.5 2.5-5.5 2.5',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  )
}
