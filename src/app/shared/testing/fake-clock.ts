import type { Clock, IdGenerator } from '@pp/shared/kernel';

export class FakeClock implements Clock {
  constructor(private current: Date = new Date('2026-10-30T13:00:00-05:00')) {}

  now(): Date {
    return new Date(this.current);
  }

  set(date: Date): void {
    this.current = date;
  }
}

/** Predictable ids: `id-1`, `id-2`, ... */
export class SequentialIdGenerator implements IdGenerator {
  private n = 0;

  next(): string {
    return `id-${++this.n}`;
  }
}
