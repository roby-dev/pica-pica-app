import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { FakeClock } from '@pp/shared/testing';
import { LiveClock } from './live-clock';
import { CLOCK } from './tokens';

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(TestBed.inject(DOCUMENT), 'visibilityState', { value: state, configurable: true });
  TestBed.inject(DOCUMENT).dispatchEvent(new Event('visibilitychange'));
}

describe('LiveClock', () => {
  let clock: FakeClock;

  beforeEach(() => {
    clock = new FakeClock(new Date('2026-10-30T08:00:00-05:00'));
    TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: clock }] });
  });

  it('keeps the same time until something refreshes it', () => {
    const live = TestBed.inject(LiveClock);
    const first = live.now();

    clock.set(new Date('2026-10-30T21:00:00-05:00'));

    expect(live.now()).toEqual(first);
    live.refresh();
    expect(live.now()).toEqual(new Date('2026-10-30T21:00:00-05:00'));
  });

  it('refreshes when the app comes back to the foreground, not when it leaves', () => {
    const live = TestBed.inject(LiveClock);
    expect(live.now()).toEqual(new Date('2026-10-30T08:00:00-05:00'));
    clock.set(new Date('2026-10-31T07:00:00-05:00'));

    setVisibility('hidden');
    expect(live.now()).toEqual(new Date('2026-10-30T08:00:00-05:00'));

    setVisibility('visible');
    expect(live.now()).toEqual(new Date('2026-10-31T07:00:00-05:00'));
  });
});
