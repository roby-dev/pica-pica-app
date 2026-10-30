import { inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { ThemeService } from './theme/theme.service';

/** Starts the theme service at launch so the saved theme applies as soon as settings load. */
export function provideShell() {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
  ]);
}
