import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { SettingsStore } from '@pp/settings';

const LIGHT_COLOR = '#f4f7fb';
const DARK_COLOR = '#1f1e30';
const STORAGE_KEY = 'pp-theme';

/**
 * Applies the saved theme: `data-theme` on <html>, the browser chrome color, and a localStorage hint
 * the pre-paint script in index.html reads to avoid a light/dark flash on the next launch.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly settings = inject(SettingsStore);
  private readonly document = inject(DOCUMENT);
  private readonly systemDark = signal(false);

  constructor() {
    const query = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    if (query) {
      this.systemDark.set(query.matches);
      const onChange = (event: MediaQueryListEvent) => this.systemDark.set(event.matches);
      query.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
    }

    effect(() => {
      // Wait for the stored settings so the default "system" never overrides a saved choice.
      if (!this.settings.ready()) return;
      const preference = this.settings.theme();
      const dark = preference === 'dark' || (preference === 'system' && this.systemDark());

      this.document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      this.document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? DARK_COLOR : LIGHT_COLOR);
      try {
        localStorage.setItem(STORAGE_KEY, preference);
      } catch {
        // Private mode or blocked storage: the hint is optional.
      }
    });
  }
}
