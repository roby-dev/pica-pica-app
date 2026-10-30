import type { Category, PaymentMethod } from './category';
import { categoryId, paymentMethodId } from './ids';

const category = (slug: string, name: string, emoji: string, color: string): Category => ({
  id: categoryId(`cat-${slug}`),
  name,
  emoji,
  color,
  archived: false,
});

const method = (slug: string, name: string, kind: PaymentMethod['kind']): PaymentMethod => ({
  id: paymentMethodId(`pm-${slug}`),
  name,
  kind,
  archived: false,
});

/** Starting catalog for Peru. Stable ids keep imports and backups portable across devices. */
export const SEED_CATEGORIES: readonly Category[] = [
  category('cafe', 'Café', '☕', 'oklch(0.88 0.07 70)'),
  category('snacks', 'Snacks', '🍪', 'oklch(0.88 0.07 30)'),
  category('transporte', 'Transporte', '🚌', 'oklch(0.88 0.06 240)'),
  category('delivery', 'Delivery', '🛵', 'oklch(0.88 0.07 20)'),
  category('suscripciones', 'Suscripciones', '📱', 'oklch(0.88 0.06 290)'),
  category('antojos', 'Antojos', '🍦', 'oklch(0.9 0.06 350)'),
  category('bodega', 'Bodega', '🛒', 'oklch(0.89 0.06 150)'),
  category('otros', 'Otros', '✨', 'oklch(0.89 0.02 265)'),
];

export const SEED_PAYMENT_METHODS: readonly PaymentMethod[] = [
  method('efectivo', 'Efectivo', 'cash'),
  method('debito', 'Débito', 'debit'),
  method('credito', 'Crédito', 'credit'),
  method('yape-plin', 'Yape/Plin', 'wallet'),
  method('transferencia', 'Transferencia', 'transfer'),
];
