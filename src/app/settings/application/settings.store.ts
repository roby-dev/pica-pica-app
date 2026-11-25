import { Injectable, computed, inject, resource } from '@angular/core';
import type { DomainError, Money, Result } from '@pp/shared/kernel';
import { defaultSettings, type AppSettings } from '../domain/app-settings';
import type { SettingsPatch } from '../domain/settings.rules';
import { SETTINGS_REPOSITORY } from './ports/settings.repository';
import { updateSettings } from './use-cases/update-settings';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly repository = inject(SETTINGS_REPOSITORY);
  private initialSettings?: Promise<AppSettings>;

  private readonly loaded = resource({ loader: () => this.loadInitialSettings() });

  private loadInitialSettings(): Promise<AppSettings> {
    return (this.initialSettings ??= this.repository.load().then((stored) => stored ?? defaultSettings()));
  }

  /** Defaults until the stored settings arrive, so consumers never deal with "no settings". */
  readonly settings = computed<AppSettings>(() => this.loaded.value() ?? defaultSettings());
  readonly ready = computed(() => this.loaded.hasValue());
  readonly defaultCurrency = computed(() => this.settings().defaultCurrency);
  readonly antExpenseThreshold = computed(() => this.settings().antExpenseThreshold);
  /** One cap per configured currency, with no default caps. */
  readonly weeklyBudgets = computed<readonly Money[]>(() => this.settings().weeklyBudgets ?? []);
  readonly theme = computed(() => this.settings().theme);
  readonly lastBackupAt = computed(() => this.settings().lastBackupAt);

  async update(patch: SettingsPatch): Promise<Result<AppSettings, DomainError>> {
    // Apply even an early patch to persisted settings, not the temporary read defaults.
    const current = this.ready() ? this.settings() : await this.loadInitialSettings();
    const result = await updateSettings(this.repository, current, patch);
    if (result.ok) this.loaded.set(result.value);
    return result;
  }
}
