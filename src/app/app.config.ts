import { registerLocaleData } from '@angular/common';
import localeEsPE from '@angular/common/locales/es-PE';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideSettings } from '@pp/settings';
import { provideShared } from '@pp/shared/di';
import { routes } from './app.routes';

registerLocaleData(localeEsPE);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideShared(),
    provideSettings({ persistence: 'indexeddb' }),
    { provide: LOCALE_ID, useValue: 'es-PE' },
  ],
};
