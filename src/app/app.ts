import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'pp-root',
  imports: [RouterOutlet],
  template: '<div class="app-bg"></div><router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
