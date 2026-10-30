import type { Routes } from '@angular/router';

export const insightsRoutes: Routes = [
  {
    path: 'insights',
    title: 'Análisis',
    loadComponent: () => import('./ui/pages/insights/insights.page').then((m) => m.InsightsPage),
  },
];
