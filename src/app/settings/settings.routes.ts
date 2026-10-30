import type { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
  {
    path: '',
    title: 'Ajustes',
    loadComponent: () => import('./ui/pages/settings/settings.page').then((m) => m.SettingsPage),
  },
];
