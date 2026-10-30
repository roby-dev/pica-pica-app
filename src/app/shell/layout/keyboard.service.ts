import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Space the on-screen keyboard must take before we treat it as open (ignores browser toolbars). */
const KEYBOARD_THRESHOLD_PX = 150;

/** Tracks the iOS on-screen keyboard through the visual viewport so fixed bars can step aside. */
@Injectable({ providedIn: 'root' })
export class KeyboardService {
  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();

  constructor() {
    const viewport = typeof window === 'undefined' ? undefined : window.visualViewport;
    if (!viewport) return;

    const update = () => this._open.set(window.innerHeight - viewport.height > KEYBOARD_THRESHOLD_PX);
    viewport.addEventListener('resize', update);
    inject(DestroyRef).onDestroy(() => viewport.removeEventListener('resize', update));
  }
}
