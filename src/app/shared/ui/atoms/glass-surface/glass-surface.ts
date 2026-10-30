import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type GlassVariant = 'card' | 'bar' | 'sheet' | 'chip';
export type GlassElevation = 1 | 2 | 3;

const VARIANT_CLASS: Record<GlassVariant, string> = {
  card: 'glass',
  bar: 'glass-strong',
  sheet: 'glass-strong',
  chip: 'glass !rounded-full',
};

const ELEVATION_CLASS: Record<GlassElevation, string> = {
  1: '',
  2: 'shadow-lg',
  3: 'shadow-xl',
};

/** The only place glass is applied: keeps blur layers countable and consistent. */
@Component({
  selector: 'pp-glass-surface',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class GlassSurface {
  readonly variant = input<GlassVariant>('card');
  readonly elevation = input<GlassElevation>(1);
  readonly interactive = input(false);

  protected readonly classes = computed(
    () =>
      `block ${VARIANT_CLASS[this.variant()]} ${ELEVATION_CLASS[this.elevation()]} ${
        this.interactive() ? 'cursor-pointer transition active:scale-[0.99]' : ''
      }`,
  );
}
