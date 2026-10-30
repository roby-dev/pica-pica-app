import type { SettingsRepository } from '../application/ports/settings.repository';
import type { AppSettings } from '../domain/app-settings';

export class InMemorySettingsRepository implements SettingsRepository {
  private stored: AppSettings | null = null;

  async load(): Promise<AppSettings | null> {
    return this.stored;
  }

  async save(settings: AppSettings): Promise<void> {
    this.stored = settings;
  }
}
