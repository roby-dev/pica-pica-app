import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

const DISMISSED_KEY = 'pp-install-hint-dismissed';

/**
 * iOS never offers to install a web app by itself; the user has to use Share > Add to Home Screen.
 * This knows when to remind them: on an iPhone or iPad, in the browser, until they dismiss it.
 */
@Injectable({ providedIn: 'root' })
export class IosInstallService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly dismissed = signal(this.readDismissed());

  private readonly isIos = this.detectIos();
  private readonly installed = this.detectStandalone();

  readonly visible = computed(() => this.isIos && !this.installed && !this.dismissed());

  dismiss(): void {
    this.dismissed.set(true);
    try {
      this.window?.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Private browsing can refuse storage; the hint just comes back next launch.
    }
  }

  private detectIos(): boolean {
    const nav = this.window?.navigator;
    if (!nav) return false;
    // iPadOS reports itself as a Mac, but only the iPad has a touch screen.
    return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  }

  private detectStandalone(): boolean {
    const win = this.window;
    if (!win) return false;
    const legacy = (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const modern = typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches;
    return legacy || modern;
  }

  private readDismissed(): boolean {
    try {
      return this.window?.localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  }
}
