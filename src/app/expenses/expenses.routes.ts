import type { Routes } from '@angular/router';

/** Every page is a lazy chunk, so the first paint only loads the shell. */
export const expensesRoutes: Routes = [
  {
    path: 'add',
    title: 'Agregar',
    loadComponent: () => import('./ui/pages/quick-add/quick-add.page').then((m) => m.QuickAddPage),
  },
  {
    path: 'history',
    title: 'Historial',
    loadComponent: () => import('./ui/pages/history/history.page').then((m) => m.HistoryPage),
  },
  {
    path: 'history/:id',
    title: 'Editar gasto',
    loadComponent: () =>
      import('./ui/pages/expense-edit/expense-edit.page').then((m) => m.ExpenseEditPage),
  },
];
