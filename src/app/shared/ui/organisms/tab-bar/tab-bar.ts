import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, type IconName } from '../../atoms/icon/icon';

export interface TabItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
}

/** Floating glass tab bar docked above the iOS home indicator. Each tab is at least 56px tall. */
@Component({
  selector: 'pp-tab-bar',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <nav
      class="glass-strong fixed inset-x-4 z-20 mx-auto flex max-w-md gap-1 p-2 transition duration-200"
      style="bottom: calc(env(safe-area-inset-bottom) + 8px)"
      [class.translate-y-32]="hidden()"
      [class.opacity-0]="hidden()"
      [attr.aria-hidden]="hidden()"
      aria-label="Navegación principal"
    >
      @for (item of items(); track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="bg-white/70 text-ink"
          class="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.25rem] text-[11px] font-semibold text-ink-muted transition active:scale-95"
          [attr.tabindex]="hidden() ? -1 : null"
        >
          <pp-icon [name]="item.icon" [size]="24" />
          {{ item.label }}
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabBar {
  readonly items = input.required<readonly TabItem[]>();
  /** Hidden while the on-screen keyboard is open so it never covers the form. */
  readonly hidden = input(false);
}
