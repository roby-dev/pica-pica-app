import type { Category, PaymentMethod } from './category';
import { categoryId, paymentMethodId } from './ids';

const category = (position: number, slug: string, name: string, emoji: string, color: string): Category => ({
  id: categoryId(`cat-${slug}`),
  name,
  emoji,
  color,
  archived: false,
  position,
});

const method = (position: number, slug: string, name: string, kind: PaymentMethod['kind']): PaymentMethod => ({
  id: paymentMethodId(`pm-${slug}`),
  name,
  kind,
  archived: false,
  position,
});

/** Starting catalog for Peru. Stable ids keep imports and backups portable across devices. */
export const SEED_CATEGORIES: readonly Category[] = [
  category(0, 'cafe', 'Café', '☕', 'oklch(0.88 0.07 70)'),
  category(1, 'snacks', 'Snacks', '🍪', 'oklch(0.88 0.07 30)'),
  category(2, 'transporte', 'Transporte', '🚌', 'oklch(0.88 0.06 240)'),
  category(3, 'delivery', 'Delivery', '🛵', 'oklch(0.88 0.07 20)'),
  category(4, 'suscripciones', 'Suscripciones', '📱', 'oklch(0.88 0.06 290)'),
  category(5, 'antojos', 'Antojos', '🍦', 'oklch(0.9 0.06 350)'),
  category(6, 'bodega', 'Bodega', '🛒', 'oklch(0.89 0.06 150)'),
  category(7, 'mercado', 'Mercado', '🧺', 'oklch(0.88 0.07 130)'),
  category(8, 'otros', 'Otros', '✨', 'oklch(0.89 0.02 265)'),
];

export const SEED_PAYMENT_METHODS: readonly PaymentMethod[] = [
  method(0, 'efectivo', 'Efectivo', 'cash'),
  method(1, 'debito', 'Débito', 'debit'),
  method(2, 'credito', 'Crédito', 'credit'),
  method(3, 'yape-plin', 'Yape/Plin', 'wallet'),
  method(4, 'transferencia', 'Transferencia', 'transfer'),
];
