import {
  Bus,
  Ellipsis,
  HeartPulse,
  Shirt,
  ShoppingCart,
  Ticket,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { CATEGORIES } from '../lib/categories';
import type { CategoryId } from '../lib/types';
import type { Theme } from '../hooks/useTheme';

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  comida: Utensils,
  super: ShoppingCart,
  transporte: Bus,
  servicios: Zap,
  salud: HeartPulse,
  ocio: Ticket,
  ropa: Shirt,
  otros: Ellipsis,
};

export function categoryColor(id: CategoryId, theme: Theme): string {
  return CATEGORIES[id].color[theme];
}

interface CategoryIconProps {
  id: CategoryId;
  theme: Theme;
  size?: 'sm' | 'md';
}

/** Ícono de categoría sobre un fondo suave de su color. Decorativo: el nombre siempre va en texto. */
export function CategoryIcon({ id, theme, size = 'md' }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[id];
  const color = categoryColor(id, theme);
  return (
    <span className={`cat-icon cat-icon--${size}`} style={{ color, background: `${color}1c` }} aria-hidden="true">
      <Icon size={size === 'sm' ? 15 : 18} strokeWidth={2} />
    </span>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <path d="M5 7h22v9a11 11 0 0 1-22 0z" fill="var(--primary)" />
        <path d="M8.5 11.5h15" stroke="var(--on-primary)" strokeWidth="1.8" strokeDasharray="2 2" strokeLinecap="round" />
        <circle cx="23.5" cy="7" r="4.5" fill="var(--coin)" stroke="var(--bg)" strokeWidth="2" />
      </svg>
      <span className="logo__word">Bolsillo</span>
    </span>
  );
}
