import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { SwUpdate, type VersionEvent, type VersionReadyEvent } from '@angular/service-worker';
import { ToastService } from '@pp/shared/ui';
import { filter } from 'rxjs';

/** Reloads the page. A token so tests do not navigate. */
export const RELOAD_PAGE = new InjectionToken<() => void>('ReloadPage', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return () => document.location.reload();
  },
});

const isVersionReady = (event: VersionEvent): event is VersionReadyEvent => event.type === 'VERSION_READY';

/**
 * Tells the user when a new version has been downloaded and applies it on request. Installed iOS apps
 * stay in memory for days, so it also checks for updates every time the app comes back to the foreground.
 */
@Injectable({ providedIn: 'root' })
export class SwUpdateService {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly reload = inject(RELOAD_PAGE);

  private started = false;

  start(): void {
    const updates = this.updates;
    if (this.started || !updates?.isEnabled) return;
    this.started = true;

    updates.versionUpdates.pipe(filter(isVersionReady)).subscribe(() =>
      this.toast.show({
        message: 'Hay una versión nueva',
        actionLabel: 'Actualizar',
        durationMs: 30_000,
        onAction: () => void this.apply(updates),
      }),
    );

    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible') void updates.checkForUpdate().catch(() => false);
    });
  }

  private async apply(updates: SwUpdate): Promise<void> {
    try {
      await updates.activateUpdate();
    } finally {
      // Reload even if activation reported nothing: the worst case is loading the same version again.
      this.reload();
    }
  }
}
