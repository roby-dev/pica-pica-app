import { makeEnvironmentProviders } from '@angular/core';
import { SETTINGS_REPOSITORY } from './application/ports/settings.repository';
import { IdbSettingsRepository } from './infrastructure/idb-settings.repository';
import { InMemorySettingsRepository } from './infrastructure/in-memory-settings.repository';

export type PersistenceKind = 'indexeddb' | 'memory';

export interface SettingsOptions {
  readonly persistence: PersistenceKind;
}

/** Binds the settings port to an adapter. Switching storage is a one-line change in the root config. */
export function provideSettings(options: SettingsOptions) {
  return makeEnvironmentProviders([
    options.persistence === 'memory'
      ? { provide: SETTINGS_REPOSITORY, useClass: InMemorySettingsRepository }
      : { provide: SETTINGS_REPOSITORY, useClass: IdbSettingsRepository },
  ]);
}
