import type { DomainError, Result } from '@pp/shared/kernel';
import { ok } from '@pp/shared/kernel';
import type { AppSettings } from '../../domain/app-settings';
import { applySettingsPatch, type SettingsPatch } from '../../domain/settings.rules';
import type { SettingsRepository } from '../ports/settings.repository';

/** Validates the patch against the rules and persists the result. Nothing is saved on failure. */
export async function updateSettings(
  repository: SettingsRepository,
  current: AppSettings,
  patch: SettingsPatch,
): Promise<Result<AppSettings, DomainError>> {
  const applied = applySettingsPatch(current, patch);
  if (!applied.ok) return applied;
  await repository.save(applied.value);
  return ok(applied.value);
}
