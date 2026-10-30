import { InjectionToken } from '@angular/core';
import type { AppSettings } from '../../domain/app-settings';

export interface SettingsRepository {
  /** Returns null when nothing has been saved yet (first run) or the stored data is unreadable. */
  load(): Promise<AppSettings | null>;
  save(settings: AppSettings): Promise<void>;
}

export const SETTINGS_REPOSITORY = new InjectionToken<SettingsRepository>('SettingsRepository');
