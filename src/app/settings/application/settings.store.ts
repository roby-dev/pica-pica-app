import { Injectable, computed, inject, resource } from '@angular/core';
import type { DomainError, Result } from '@pp/shared/kernel';
import { defaultSettings, type AppSettings } from '../domain/app-settings';
import type { SettingsPatch } from '../domain/settings.rules';
import { SETTINGS_REPOSITORY } from './ports/settings.repository';
import { updateSettings } from './use-cases/update-settings';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly repository = inject(SETTINGS_REPOSITORY);

  private readonly loaded = resource({
    loader: async () => (await this.repository.load()) ?? defaultSettings(),
  });

  /** Defaults until the stored settings arrive, so consumers never deal with "no settings". */
  readonly settings = computed<AppSettings>(() => this.loaded.value() ?? defaultSettings());
  readonly ready = computed(() => this.loaded.hasValue());
  readonly defaultCurrency = computed(() => this.settings().defaultCurrency);
  readonly antExpenseThreshold = computed(() => this.settings().antExpenseThreshold);
  readonly theme = computed(() => this.settings().theme);
  readonly lastBackupAt = computed(() => this.settings().lastBackupAt);

  async update(patch: SettingsPatch): Promise<Result<AppSettings, DomainError>> {
    const result = await updateSettings(this.repository, this.settings(), patch);
    if (result.ok) this.loaded.set(result.value);
    return result;
  }
}
