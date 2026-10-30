export { SettingsStore } from './application/settings.store';
export { SETTINGS_REPOSITORY, type SettingsRepository } from './application/ports/settings.repository';
export {
  defaultSettings,
  type AppSettings,
  type ThemePreference,
} from './domain/app-settings';
export {
  InvalidThresholdError,
  ThresholdCurrencyRequiredError,
  type SettingsPatch,
} from './domain/settings.rules';
export { provideSettings, type PersistenceKind, type SettingsOptions } from './settings.providers';
