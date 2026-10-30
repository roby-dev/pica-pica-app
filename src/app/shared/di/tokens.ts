import { InjectionToken } from '@angular/core';
import {
  systemClock,
  uuidGenerator,
  type Clock,
  type IdGenerator,
} from '@pp/shared/kernel';
import { openPicaPicaDb, type PicaPicaDatabase } from '@pp/shared/persistence';

export const CLOCK = new InjectionToken<Clock>('Clock', {
  providedIn: 'root',
  factory: () => systemClock,
});

export const ID_GENERATOR = new InjectionToken<IdGenerator>('IdGenerator', {
  providedIn: 'root',
  factory: () => uuidGenerator,
});

/** Opened lazily on first inject, so the shell paints before IndexedDB is touched. */
export const IDB_DATABASE = new InjectionToken<Promise<PicaPicaDatabase>>('IdbDatabase', {
  providedIn: 'root',
  factory: () => openPicaPicaDb(),
});
