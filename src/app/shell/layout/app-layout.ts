import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TabBar, Toast, ToastService } from '@pp/shared/ui';
import { TAB_ITEMS } from '../navigation/tab-items';
import { SwipeNav } from '../navigation/swipe-nav';
import { InstallHint } from '../pwa/install-hint';
import { IosInstallService } from '../pwa/ios-install.service';
import { KeyboardService } from './keyboard.service';

/** The app frame: background, page outlet, floating tab bar and toast host. */
@Component({
  selector: 'pp-app-layout',
  imports: [InstallHint, RouterOutlet, SwipeNav, TabBar, Toast],
  template: `
    <div class="app-bg"></div>
    <main
      ppSwipeNav
      class="mx-auto w-full max-w-md px-4"
      style="padding-bottom: calc(env(safe-area-inset-bottom) + 104px)"
      [style.--pp-bottom-offset]="keyboard.open() ? '8px' : '88px'"
    >
      <pp-install-hint [class.pt-3]="install.visible()" [visible]="install.visible()" (dismissed)="install.dismiss()" />
      <router-outlet />
    </main>

    <pp-tab-bar [items]="tabs" [hidden]="keyboard.open()" />

    @if (toasts.current(); as toast) {
      <div
        class="fixed inset-x-4 z-30 mx-auto max-w-md"
        style="bottom: calc(env(safe-area-inset-bottom) + 88px)"
      >
        <pp-toast
          [message]="toast.message"
          [actionLabel]="toast.actionLabel"
          [durationMs]="toast.durationMs ?? 5000"
          (action)="runToastAction(toast.onAction)"
          (dismissed)="toasts.dismiss()"
        />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  protected readonly tabs = TAB_ITEMS;
  protected readonly keyboard = inject(KeyboardService);
  protected readonly toasts = inject(ToastService);
  protected readonly install = inject(IosInstallService);

  protected runToastAction(action: (() => void) | undefined): void {
    action?.();
    this.toasts.dismiss();
  }
}
