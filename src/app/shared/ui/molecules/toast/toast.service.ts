import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  readonly message: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly durationMs?: number;
}

/** One toast at a time: a new one replaces the previous. Rendered by the app layout. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _current = signal<ToastMessage | null>(null);
  readonly current = this._current.asReadonly();

  show(toast: ToastMessage): void {
    this._current.set(toast);
  }

  dismiss(): void {
    this._current.set(null);
  }
}
