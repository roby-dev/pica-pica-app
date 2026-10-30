import type { Routes } from '@angular/router';
import { backupRoutes } from '@pp/backup';
import { expensesRoutes } from '@pp/expenses';
import { insightsRoutes } from '@pp/insights';
import { settingsRoutes } from '@pp/settings';
import { AppLayout } from '@pp/shell';

/** Composition root: each feature owns its routes, the shell owns the frame around them. */
export const routes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'add' },
      ...expensesRoutes,
      ...insightsRoutes,
      ...backupRoutes,
      { path: 'settings', children: settingsRoutes },
      { path: '**', redirectTo: 'add' },
    ],
  },
];
