import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonShape = 'text' | 'circle' | 'rect';

/** Loading placeholder; announces busy state once instead of reading every block. */
@Component({
  selector: 'pp-skeleton',
  template: `
    @for (line of rows(); track line) {
      <span [class]="blockClass()"></span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2', role: 'status', 'aria-busy': 'true', 'aria-label': 'Cargando' },
})
export class Skeleton {
  readonly shape = input<SkeletonShape>('text');
  readonly lines = input(1);

  protected readonly rows = computed(() =>
    Array.from({ length: Math.max(1, this.lines()) }, (_, i) => i),
  );

  protected readonly blockClass = computed(() => {
    const base = 'block animate-pulse bg-ink/10 motion-reduce:animate-none';
    switch (this.shape()) {
      case 'circle':
        return `${base} size-10 rounded-full`;
      case 'rect':
        return `${base} h-24 w-full rounded-glass`;
      default:
        return `${base} h-4 w-full rounded-full`;
    }
  });
}
