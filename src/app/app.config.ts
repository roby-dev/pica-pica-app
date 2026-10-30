import { registerLocaleData } from '@angular/common';
import localeEsPE from '@angular/common/locales/es-PE';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideExpenses } from '@pp/expenses';
import { provideInsights } from '@pp/insights';
import { provideSettings } from '@pp/settings';
import { provideShared } from '@pp/shared/di';
import { provideShell } from '@pp/shell';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

registerLocaleData(localeEsPE);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideShared(),
    provideShell(),
    provideSettings({ persistence: 'indexeddb' }),
    provideExpenses({ persistence: 'indexeddb' }),
    provideInsights(),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
