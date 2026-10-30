import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { adjacentTab, SwipeNav, swipeDirection } from './swipe-nav';

describe('swipeDirection', () => {
  it('moves forward when the finger goes left and back when it goes right', () => {
    expect(swipeDirection({ dx: -120, dy: 10 })).toBe(1);
    expect(swipeDirection({ dx: 120, dy: -10 })).toBe(-1);
  });

  it('ignores short drags and mostly vertical scrolls', () => {
    expect(swipeDirection({ dx: -40, dy: 0 })).toBe(0);
    expect(swipeDirection({ dx: -100, dy: 90 })).toBe(0);
  });
});

describe('adjacentTab', () => {
  it('walks the tabs in order', () => {
    expect(adjacentTab('/add', 1)).toBe('/history');
    expect(adjacentTab('/history', 1)).toBe('/insights');
    expect(adjacentTab('/settings', -1)).toBe('/insights');
  });

  it('stops at both ends', () => {
    expect(adjacentTab('/add', -1)).toBeNull();
    expect(adjacentTab('/settings', 1)).toBeNull();
  });

  it('does nothing outside the tab roots, such as the edit page', () => {
    expect(adjacentTab('/history/abc', 1)).toBeNull();
    expect(adjacentTab('/settings/categories', -1)).toBeNull();
  });

  it('ignores query strings and fragments', () => {
    expect(adjacentTab('/add?x=1#top', 1)).toBe('/history');
  });
});

@Component({
  selector: 'pp-host',
  imports: [SwipeNav],
  template: `<div ppSwipeNav><p id="plain">text</p><div class="scroll-row"><span id="chips">chips</span></div></div>`,
})
class Host {}

function touch(el: Element, type: 'touchstart' | 'touchend', x: number, y = 100): void {
  const point = { clientX: x, clientY: y };
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'touches', { value: type === 'touchstart' ? [point] : [] });
  Object.defineProperty(event, 'changedTouches', { value: [point] });
  el.dispatchEvent(event);
}

describe('SwipeNav directive', () => {
  async function setup(url: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', children: [] }])],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return { navigate, root: fixture.nativeElement as HTMLElement };
  }

  it('navigates to the next tab on a left swipe', async () => {
    const { navigate, root } = await setup('/add');
    const target = root.querySelector('#plain')!;
    touch(target, 'touchstart', 300);
    touch(target, 'touchend', 120);
    expect(navigate).toHaveBeenCalledWith('/history');
  });

  it('leaves swipes that start on a scrollable chip row alone', async () => {
    const { navigate, root } = await setup('/add');
    const target = root.querySelector('#chips')!;
    touch(target, 'touchstart', 300);
    touch(target, 'touchend', 120);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing on the edit page', async () => {
    const { navigate, root } = await setup('/history/abc');
    const target = root.querySelector('#plain')!;
    touch(target, 'touchstart', 300);
    touch(target, 'touchend', 120);
    expect(navigate).not.toHaveBeenCalled();
  });
});
