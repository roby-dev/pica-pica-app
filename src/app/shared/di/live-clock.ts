import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { CLOCK } from './tokens';

/**
 * The current time as a signal, for derived state such as "today" or habit ranking.
 * An installed iOS PWA resumes from the background without reloading, so the time is read again
 * whenever the app becomes visible; otherwise "today" would stay on the day the app was opened.
 */
@Injectable({ providedIn: 'root' })
export class LiveClock {
  private readonly clock = inject(CLOCK);
  private readonly tick = signal(0);

  readonly now = computed(() => {
    this.tick();
    return this.clock.now();
  });

  constructor() {
    const document = inject(DOCUMENT);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') this.refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('visibilitychange', onVisibility));
  }

  refresh(): void {
    this.tick.update((n) => n + 1);
  }
}
