import { Directive, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TAB_ITEMS } from './tab-items';

/** Minimum horizontal travel, in px, for a drag to count as a swipe. */
export const SWIPE_MIN_DISTANCE = 70;
/** The drag must be this much more horizontal than vertical, so scrolling never switches tabs. */
export const SWIPE_DOMINANCE = 1.6;

export interface SwipeDelta {
  readonly dx: number;
  readonly dy: number;
}

/** `1` = next tab (finger moved left), `-1` = previous tab, `0` = not a swipe. */
export function swipeDirection({ dx, dy }: SwipeDelta): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * The tab next to `url` in `direction`, or null at either end or when `url` is not exactly a tab
 * (for example `/history/123`, the edit page, where swiping must do nothing).
 */
export function adjacentTab(url: string, direction: -1 | 1): string | null {
  const path = url.split(/[?#]/)[0];
  const index = TAB_ITEMS.findIndex((tab) => tab.path === path);
  if (index === -1) return null;
  return TAB_ITEMS[index + direction]?.path ?? null;
}

/** Elements that own horizontal or text gestures; a swipe that starts on them is theirs. */
const OWN_GESTURE = 'input, textarea, select, dialog, [contenteditable], .scroll-row';

/** Swipe the page sideways to move between bottom-nav tabs. Never calls preventDefault. */
@Directive({
  selector: '[ppSwipeNav]',
  host: {
    '(touchstart)': 'onStart($event)',
    '(touchend)': 'onEnd($event)',
    '(touchcancel)': 'start = null',
  },
})
export class SwipeNav {
  private readonly router = inject(Router);
  protected start: { x: number; y: number } | null = null;

  protected onStart(event: TouchEvent): void {
    const touch = event.touches[0];
    const target = event.target as Element | null;
    const blocked = event.touches.length !== 1 || !!target?.closest?.(OWN_GESTURE);
    this.start = touch && !blocked ? { x: touch.clientX, y: touch.clientY } : null;
  }

  protected onEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    const start = this.start;
    this.start = null;
    if (!start || !touch) return;

    const direction = swipeDirection({ dx: touch.clientX - start.x, dy: touch.clientY - start.y });
    if (direction === 0) return;
    const next = adjacentTab(this.router.url, direction);
    if (next) void this.router.navigateByUrl(next);
  }
}
