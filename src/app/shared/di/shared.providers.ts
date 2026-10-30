import { makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { requestPersistentStorage } from '@pp/shared/persistence';

/** Shared runtime wiring. Clock, ids and the database are root-provided tokens, overridable in tests. */
export function provideShared() {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      void requestPersistentStorage();
    }),
  ]);
}
