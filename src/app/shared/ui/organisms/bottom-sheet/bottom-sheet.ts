import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { IconButton } from '../../atoms/icon-button/icon-button';

/** Modal sheet on the native `<dialog>`: focus trap, Escape and top-layer for free. */
@Component({
  selector: 'pp-bottom-sheet',
  imports: [IconButton],
  template: `
    <dialog
      #dialog
      class="glass-strong fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto !rounded-b-none p-5 text-ink backdrop:bg-ink/30 backdrop:backdrop-blur-sm"
      style="padding-bottom: calc(env(safe-area-inset-bottom) + 20px)"
      [attr.aria-label]="title()"
      (cancel)="onCancel($event)"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-xl font-bold">{{ title() }}</h2>
        <pp-icon-button icon="close" label="Cerrar" (pressed)="close()" />
      </div>
      <ng-content />
    </dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheet {
  readonly title = input.required<string>();
  readonly open = model(false);
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // The backdrop is the dialog box itself; listen natively so the template needs no click handler.
    afterNextRender(() => {
      const element = this.dialog().nativeElement;
      element.addEventListener('click', (event) => {
        if (event.target === element) this.close();
      });
    });

    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.open() && !element.open) element.showModal();
      if (!this.open() && element.open) element.close();
    });
  }

  protected close(): void {
    this.open.set(false);
    this.closed.emit();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

}
