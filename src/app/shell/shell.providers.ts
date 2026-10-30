import { inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { SwUpdateService } from './pwa/sw-update.service';
import { ThemeService } from './theme/theme.service';

/** Starts the theme (so the saved one applies as soon as settings load) and the update checks at launch. */
export function provideShell() {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(SwUpdateService).start();
    }),
  ]);
}
