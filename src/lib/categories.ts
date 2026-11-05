import type { CategoryId } from './types';

export interface CategoryInfo {
  label: string;
  /** Colores apagados, verificados a ≥ 3:1 contra la superficie (ver scripts/contrast.mjs). */
  color: { light: string; dark: string };
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  comida: { label: 'Comida', color: { light: '#C47552', dark: '#DE9875' } },
  super: { label: 'Super', color: { light: '#4F8D5C', dark: '#7DB98A' } },
  transporte: { label: 'Transporte', color: { light: '#4A78B5', dark: '#7FA5DA' } },
  servicios: { label: 'Servicios', color: { light: '#A8852F', dark: '#D2AF5E' } },
  salud: { label: 'Salud', color: { light: '#B6566B', dark: '#D9849A' } },
  ocio: { label: 'Ocio', color: { light: '#7462C0', dark: '#A596E4' } },
  ropa: { label: 'Ropa', color: { light: '#3C8989', dark: '#6DBBBB' } },
  otros: { label: 'Otros', color: { light: '#857D72', dark: '#ABA397' } },
};
