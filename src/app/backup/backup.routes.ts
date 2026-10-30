import type { Routes } from '@angular/router';

export const backupRoutes: Routes = [
  {
    path: 'settings/backup',
    title: 'Respaldo',
    loadComponent: () => import('./ui/pages/backup/backup.page').then((m) => m.BackupPage),
  },
];
