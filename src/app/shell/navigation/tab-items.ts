import type { TabItem } from '@pp/shared/ui';

/** Bottom navigation, in order. Paths are the lazy routes of each feature. */
export const TAB_ITEMS: readonly TabItem[] = [
  { path: '/add', label: 'Agregar', icon: 'plus' },
  { path: '/history', label: 'Historial', icon: 'list' },
  { path: '/insights', label: 'Análisis', icon: 'chart' },
  { path: '/settings', label: 'Ajustes', icon: 'settings' },
];
