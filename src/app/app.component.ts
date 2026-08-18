import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  template: '<router-outlet />',
  imports: [RouterOutlet]
})
export class AppComponent {
  title = 'SmartComanda Admin';

  readonly #titleService = inject(Title);
  readonly #themeService = inject(ThemeService);

  constructor() {
    this.#titleService.setTitle(this.title);
  }
}
